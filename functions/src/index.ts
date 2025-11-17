import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {startOfQuarter, endOfQuarter} from "date-fns"; // Removed getQuarter

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * This function runs on a schedule (e.g., "every 1 hours").
 * It calculates all dashboard statistics server-side and saves them
 * to a single document: /stats/dashboard.
 *
 * Your app will read this ONE document instead of thousands.
 */
export const updateDashboardStats = onSchedule(
  "every 1 hours",
  async (_event) => { // _event warning is safe to ignore
    logger.info("Starting scheduled statistics update...", {
      structuredData: true,
    });

    try {
      // 1. Fetch all data using Collection Group Queries
      // These queries are fast and run on the server.
      const householdsSnap = await db.collection("households").get();
      const childrenSnap = await db.collectionGroup("children").get();
      const visitsSnap = await db.collectionGroup("followUpVisits").get();

      // 2. Perform Calculations
      const now = new Date();
      // const currentQuarter = getQuarter(now); // Unused variable
      // const currentYear = getYear(now); // Unused variable
      const quarterStart = startOfQuarter(now);
      const quarterEnd = endOfQuarter(now);

      const totalFamilies = householdsSnap.size;
      const totalChildren = childrenSnap.size;

      let childrenStudying = 0;
      childrenSnap.forEach((doc) => {
        if (doc.data().isStudying) {
          childrenStudying++;
        }
      });

      // Find visits completed THIS quarter
      const visitsThisQuarter = new Set<string>();
      visitsSnap.forEach((doc) => {
        const visit = doc.data();
        // Use toDate() to convert Firestore Timestamp to JS Date
        // Line break to fix potential max-len error
        const visitDate =
          (visit.visitDate as admin.firestore.Timestamp).toDate();

        if (
          visit.status === "Completed" &&
          visitDate >= quarterStart &&
          visitDate <= quarterEnd
        ) {
          visitsThisQuarter.add(visit.householdId);
        }
      });

      // 3. Prepare the final stats object
      const statsData = {
        totalFamilies: totalFamilies,
        totalChildren: totalChildren,
        childrenStudying: childrenStudying,
        childrenNotStudying: totalChildren - childrenStudying,
        visitsThisQuarter: visitsThisQuarter.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 4. Save the result to a single document
      const statsDocRef = db.doc("stats/dashboard");
      await statsDocRef.set(statsData);

      logger.info("Successfully updated dashboard stats.", statsData);
    } catch (error) {
      logger.error("Error updating dashboard stats:", error);
    }
  },
);
