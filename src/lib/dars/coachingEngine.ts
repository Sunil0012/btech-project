/**
 * Coaching Engine
 * Provides personalized guidance based on learner state and DARS metrics
 */

export type ProficiencyLevel = "Low" | "Medium" | "High";
export type VolatilityLevel = "Stable" | "Moderate" | "Volatile";

export interface CoachingContext {
  proficiency: ProficiencyLevel;
  volatility: VolatilityLevel;
  accuracy: number;
  streakState: "hot" | "steady" | "cold";
  ratingTier: "Bronze" | "Silver" | "Gold" | "Platinum";
}

export interface CoachingAdvice {
  guidance: string;
  actionItems: string[];
  estimatedTimeMin: number;
  priority: "low" | "medium" | "high";
}

export class CoachingEngine {
  /**
   * Classify proficiency level from rating
   */
  static classifyProficiency(rating: number): ProficiencyLevel {
    if (rating < 1600) return "Low";
    if (rating < 2200) return "Medium";
    return "High";
  }

  /**
   * Classify volatility from variance
   */
  static classifyVolatility(variance: number): VolatilityLevel {
    if (variance < 100) return "Stable";
    if (variance < 300) return "Moderate";
    return "Volatile";
  }

  /**
   * Generate comprehensive coaching advice
   */
  static generateAdvice(context: CoachingContext): CoachingAdvice {
    // Rule-based recommendation engine
    const advices: CoachingAdvice[] = [];

    // Proficiency-based
    if (context.proficiency === "Low" && context.accuracy < 0.5) {
      advices.push({
        guidance: "Master the fundamentals before advancing to harder concepts.",
        actionItems: [
          "Review core concepts in weak topics",
          "Work through step-by-step practice problems",
          "Use hints to learn from mistakes",
        ],
        estimatedTimeMin: 60,
        priority: "high",
      });
    }

    if (context.proficiency === "Medium" && context.accuracy >= 0.7) {
      advices.push({
        guidance: "You're ready to tackle harder problems.",
        actionItems: ["Attempt harder-difficulty items", "Focus on speed optimization", "Study advanced techniques"],
        estimatedTimeMin: 45,
        priority: "medium",
      });
    }

    if (context.proficiency === "High" && context.accuracy > 0.75) {
      advices.push({
        guidance: "Maintain excellence through challenging practice and speed work.",
        actionItems: ["Attempt timed problem sets", "Challenge yourself with advanced items", "Review edge cases"],
        estimatedTimeMin: 30,
        priority: "medium",
      });
    }

    // Volatility-based (NEW in DARS)
    if (context.volatility === "Volatile") {
      advices.push({
        guidance: "Your performance is inconsistent. Build stability before advancing.",
        actionItems: [
          "Focus on consistency drills at current level",
          "Master topics where you struggle most",
          "Avoid jumping difficulty levels",
        ],
        estimatedTimeMin: 40,
        priority: "high",
      });
    }

    // Streak-based
    if (context.streakState === "hot" && context.accuracy > 0.7) {
      advices.push({
        guidance: "You're on a roll! Momentum is in your favor.",
        actionItems: ["Continue solving while confidence is high", "Try slightly harder problems", "Build on your streak"],
        estimatedTimeMin: 30,
        priority: "low",
      });
    }

    if (context.streakState === "cold" && context.accuracy < 0.5) {
      advices.push({
        guidance: "Breaking a losing streak requires focused practice.",
        actionItems: [
          "Step back to easier problems to rebuild confidence",
          "Identify your weak areas",
          "Take a short break if frustrated",
        ],
        estimatedTimeMin: 50,
        priority: "high",
      });
    }

    // Return the highest priority advice
    if (advices.length === 0) {
      advices.push({
        guidance: "You're making good progress. Keep practicing regularly.",
        actionItems: ["Continue solving items", "Maintain current pace", "Review weak topics periodically"],
        estimatedTimeMin: 30,
        priority: "low",
      });
    }

    // Sort by priority
    advices.sort((a, b) => {
      const priorityMap = { high: 0, medium: 1, low: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });

    return advices[0];
  }

  /**
   * Get personalized study schedule
   */
  static generateStudySchedule(
    context: CoachingContext,
    availableMinutesPerDay: number
  ): { dailyGoal: string; weeklyFocus: string[] } {
    const advice = this.generateAdvice(context);

    const dailyGoal = `${Math.min(availableMinutesPerDay, advice.estimatedTimeMin)} minutes of focused study on: ${advice.guidance}`;

    const weeklyFocus: string[] = [];
    if (context.proficiency === "Low") {
      weeklyFocus.push("Monday-Tuesday: Fundamentals and basics");
      weeklyFocus.push("Wednesday-Thursday: Practice with hints");
      weeklyFocus.push("Friday-Saturday: Self-paced review");
      weeklyFocus.push("Sunday: Topic summary and weak area review");
    } else if (context.volatility === "Volatile") {
      weeklyFocus.push("Daily: Consistency drills (15 min)");
      weeklyFocus.push("Mon/Wed/Fri: Topic deep-dives");
      weeklyFocus.push("Tue/Thu: Speed practice");
      weeklyFocus.push("Weekend: Full review and consolidation");
    } else {
      weeklyFocus.push("Daily: Regular practice (30 min)");
      weeklyFocus.push("3x per week: Focused topic work");
      weeklyFocus.push("2x per week: Speed and difficulty progression");
      weeklyFocus.push("Weekly: Progress review and planning");
    }

    return { dailyGoal, weeklyFocus };
  }

  /**
   * Motivational message based on performance
   */
  static getMotivationalMessage(
    streak: number,
    ratingTier: "Bronze" | "Silver" | "Gold" | "Platinum",
    improvementDelta: number
  ): string {
    const messages: string[] = [];

    if (streak > 5) {
      messages.push(`🔥 Amazing streak! ${streak} questions in a row!`);
    } else if (streak > 3) {
      messages.push(`Great momentum! ${streak} correct in a row.`);
    }

    if (improvementDelta > 0) {
      messages.push(`📈 You're improving! Rating gained points.`);
    }

    if (ratingTier === "Gold" || ratingTier === "Platinum") {
      messages.push(`⭐ You've reached ${ratingTier} tier!`);
    }

    if (messages.length === 0) {
      messages.push("Keep practicing—every question strengthens your foundation.");
    }

    return messages.join(" ");
  }

  /**
   * Next milestone suggestion
   */
  static suggestNextMilestone(
    currentRating: number,
    currentTier: "Bronze" | "Silver" | "Gold" | "Platinum"
  ): { milestone: string; ratingTarget: number; description: string } {
    const tierThresholds = {
      Bronze: { next: "Silver", target: 1600, description: "Strengthen fundamentals and improve speed" },
      Silver: { next: "Gold", target: 2000, description: "Master all topics and solve advanced problems" },
      Gold: { next: "Platinum", target: 2500, description: "Achieve expert-level accuracy and speed" },
      Platinum: {
        next: "Platinum",
        target: currentRating + 200,
        description: "Continue building mastery and help others",
      },
    };

    const milestoneData = tierThresholds[currentTier];
    return {
      milestone: milestoneData.next,
      ratingTarget: milestoneData.target,
      description: milestoneData.description,
    };
  }
}

/**
 * Session Analytics
 */
export interface SessionAnalytics {
  sessionDurationMin: number;
  itemsAttempted: number;
  accuracy: number;
  averageTimePerItemSec: number;
  ratingChange: number;
  momentumChange: "maintained" | "gained" | "lost";
  topicPerformance: Map<string, number>;
}

export class SessionAnalyzer {
  /**
   * Analyze a study session
   */
  static analyzeSession(
    startTime: Date,
    endTime: Date,
    itemsAttempted: number,
    correctCount: number,
    ratingBefore: number,
    ratingAfter: number,
    streakBefore: number,
    streakAfter: number,
    timesPerItem: number[]
  ): SessionAnalytics {
    const durationMin = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const accuracy = itemsAttempted > 0 ? correctCount / itemsAttempted : 0;
    const avgTimePerItem = timesPerItem.length > 0 ? timesPerItem.reduce((a, b) => a + b) / timesPerItem.length : 0;

    let momentumChange: "maintained" | "gained" | "lost" = "maintained";
    if (streakAfter > streakBefore) {
      momentumChange = "gained";
    } else if (streakAfter < streakBefore) {
      momentumChange = "lost";
    }

    return {
      sessionDurationMin: Math.round(durationMin),
      itemsAttempted,
      accuracy: Math.round(accuracy * 10000) / 10000,
      averageTimePerItemSec: Math.round(avgTimePerItem / 1000),
      ratingChange: ratingAfter - ratingBefore,
      momentumChange,
      topicPerformance: new Map(), // Populated by caller with topic-specific data
    };
  }

  /**
   * Get session summary message
   */
  static getSessionSummary(analytics: SessionAnalytics): string {
    const lines: string[] = [
      `Session Summary:`,
      `Duration: ${analytics.sessionDurationMin} minutes`,
      `Items: ${analytics.itemsAttempted} attempted, ${(analytics.accuracy * 100).toFixed(0)}% accuracy`,
      `Avg. Time: ${analytics.averageTimePerItemSec}s per item`,
      `Rating Change: ${analytics.ratingChange > 0 ? "+" : ""}${analytics.ratingChange}`,
      `Momentum: ${analytics.momentumChange}`,
    ];

    return lines.join("\n");
  }
}

export function createCoachingEngine(): typeof CoachingEngine {
  return CoachingEngine;
}

export function createSessionAnalyzer(): typeof SessionAnalyzer {
  return SessionAnalyzer;
}
