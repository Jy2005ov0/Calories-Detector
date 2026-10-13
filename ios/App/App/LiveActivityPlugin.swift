import ActivityKit
import Capacitor
import Foundation

/// Starts, updates and ends the workout Live Activity (Lock Screen and Dynamic Island).
/// Live Activities need iOS 16.2; on older phones every call quietly does nothing.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "WorkoutLive"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        let attributes = WorkoutAttributes(
            title: call.getString("title") ?? "Workout",
            startedAt: Self.date(call.getDouble("startedAt")) ?? Date(),
            kcalLabel: call.getString("kcalLabel") ?? "kcal",
            restLabel: call.getString("restLabel") ?? "Rest",
            setsLabel: call.getString("setsLabel") ?? "sets"
        )
        let state = Self.state(call)
        Task {
            // One workout at a time: close any left over from before.
            for activity in Activity<WorkoutAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            do {
                _ = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil), pushType: nil)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        let state = Self.state(call)
        Task {
            for activity in Activity<WorkoutAttributes>.activities {
                await activity.update(ActivityContent(state: state, staleDate: nil))
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        Task {
            for activity in Activity<WorkoutAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    /// Milliseconds since 1970 (JavaScript time) to a Date.
    private static func date(_ ms: Double?) -> Date? {
        guard let ms, ms > 0 else { return nil }
        return Date(timeIntervalSince1970: ms / 1000)
    }

    @available(iOS 16.1, *)
    private static func state(_ call: CAPPluginCall) -> WorkoutAttributes.ContentState {
        WorkoutAttributes.ContentState(
            kcal: call.getInt("kcal") ?? 0,
            exercise: call.getString("exercise") ?? "",
            setsDone: call.getInt("setsDone") ?? 0,
            restStartedAt: date(call.getDouble("restStartedAt")),
            restEndsAt: date(call.getDouble("restEndsAt"))
        )
    }
}
