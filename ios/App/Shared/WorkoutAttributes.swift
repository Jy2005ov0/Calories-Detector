import ActivityKit
import Foundation

/// The running workout shown on the Lock Screen and in the Dynamic Island.
/// Shared by the app (which starts and updates it) and the widget extension (which draws it).
@available(iOS 16.1, *)
struct WorkoutAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Calories burned so far.
        var kcal: Int
        /// The exercise being done now, and sets finished in the whole workout.
        var exercise: String
        var setsDone: Int
        /// While resting between sets: when the rest started and ends.
        var restStartedAt: Date?
        var restEndsAt: Date?
    }

    /// Workout name ("Chest Day") and when it started (the timer counts up from here).
    var title: String
    var startedAt: Date
    /// Words in the app's language.
    var kcalLabel: String
    var restLabel: String
    var setsLabel: String
}
