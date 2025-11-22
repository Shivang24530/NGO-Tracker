import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { startOfQuarter, endOfQuarter } from "date-fns";

// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * This function runs every 1 hour and calculates
 * all dashboard statistics server-side.
 */
export const updateDashboardStats = onSchedule(
  "every 1 hours",
  async (_event) => {
    logger.info("Starting scheduled statistics update…");

    try {
      // 1. Fetch server-side snapshots
      const householdsSnap = await db.collection("households").get();
      const childrenSnap = await db.collectionGroup("children").get();
      const visitsSnap = await db.collectionGroup("followUpVisits").get();

      // 2. Calculations
      const now = new Date();
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

      const visitsThisQuarter = new Set<string>();
      visitsSnap.forEach((doc) => {
        const visit = doc.data();
        const visitDate = (visit.visitDate as admin.firestore.Timestamp).toDate();

        if (
          visit.status === "Completed" &&
          visitDate >= quarterStart &&
          visitDate <= quarterEnd
        ) {
          visitsThisQuarter.add(visit.householdId);
        }
      });

      const statsData = {
        totalFamilies,
        totalChildren,
        childrenStudying,
        childrenNotStudying: totalChildren - childrenStudying,
        visitsThisQuarter: visitsThisQuarter.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 3. Write final statistics to one document
      await db.doc("stats/dashboard").set(statsData);

      logger.info("Successfully updated dashboard stats.", statsData);
    } catch (err) {
      logger.error("Error updating dashboard stats:", err);
    }
  }
);
