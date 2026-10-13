import ActivityKit
import SwiftUI
import WidgetKit

@main
struct WorkoutWidgetBundle: WidgetBundle {
    var body: some Widget {
        WorkoutLiveActivity()
    }
}

private let flame = Color(red: 1.0, green: 0.48, blue: 0.1)

private extension WorkoutAttributes.ContentState {
    /// The rest countdown, while one is running.
    var rest: ClosedRange<Date>? {
        guard let start = restStartedAt, let end = restEndsAt, end > Date(), start < end else { return nil }
        return start...end
    }
}

/// Elapsed workout time, counting up on its own (no updates needed).
private struct Elapsed: View {
    let since: Date
    var body: some View {
        Text(timerInterval: since...Date.distantFuture, countsDown: false)
            .monospacedDigit()
    }
}

struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutAttributes.self) { context in
            // Lock Screen and notification banner.
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "dumbbell.fill").foregroundColor(flame)
                    Text(context.attributes.title).font(.headline).lineLimit(1)
                    Spacer()
                    Elapsed(since: context.attributes.startedAt).font(.title2.bold()).frame(maxWidth: 110, alignment: .trailing)
                }
                if let rest = context.state.rest {
                    HStack {
                        Text(context.attributes.restLabel).font(.subheadline.bold()).foregroundColor(flame)
                        Spacer()
                        Text(timerInterval: rest, countsDown: true).monospacedDigit().font(.subheadline.bold()).frame(maxWidth: 70, alignment: .trailing)
                    }
                    ProgressView(timerInterval: rest, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                        .tint(flame)
                } else {
                    HStack {
                        Text(context.state.exercise).font(.subheadline).lineLimit(1)
                        Spacer()
                        Text("\(context.state.kcal) \(context.attributes.kcalLabel) · \(context.state.setsDone) \(context.attributes.setsLabel)")
                            .font(.subheadline).foregroundColor(.secondary).lineLimit(1)
                    }
                }
            }
            .padding(16)
            .activityBackgroundTint(Color.black.opacity(0.8))
            .activitySystemActionForegroundColor(.white)
            .foregroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.attributes.title).lineLimit(1)
                    } icon: {
                        Image(systemName: "dumbbell.fill").foregroundColor(flame)
                    }
                    .font(.headline)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Elapsed(since: context.attributes.startedAt)
                        .font(.title3.bold())
                        .frame(maxWidth: 90, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let rest = context.state.rest {
                        VStack(spacing: 6) {
                            HStack {
                                Text(context.attributes.restLabel).bold().foregroundColor(flame)
                                Spacer()
                                Text(timerInterval: rest, countsDown: true).monospacedDigit().bold().frame(maxWidth: 70, alignment: .trailing)
                            }
                            ProgressView(timerInterval: rest, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                                .tint(flame)
                        }
                    } else {
                        HStack {
                            Text(context.state.exercise).lineLimit(1)
                            Spacer()
                            Text("\(context.state.kcal) \(context.attributes.kcalLabel)").foregroundColor(.secondary)
                        }
                        .font(.subheadline)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.rest == nil ? "dumbbell.fill" : "timer").foregroundColor(flame)
            } compactTrailing: {
                if let rest = context.state.rest {
                    Text(timerInterval: rest, countsDown: true).monospacedDigit().foregroundColor(flame).frame(maxWidth: 46)
                } else {
                    Elapsed(since: context.attributes.startedAt).frame(maxWidth: 56)
                }
            } minimal: {
                Image(systemName: context.state.rest == nil ? "dumbbell.fill" : "timer").foregroundColor(flame)
            }
            .keylineTint(flame)
        }
    }
}
