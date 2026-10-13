# Adds the workout Live Activity (Lock Screen and Dynamic Island) to the iOS project:
# the app's own Swift files, and a WidgetKit extension that draws the activity.
# Run on macOS before building (CI does this): `ruby scripts/add-live-activity.rb`.
# Safe to run again: it does nothing when the extension is already there.
require "xcodeproj"

project_path = File.expand_path("../ios/App/App.xcodeproj", __dir__)
project = Xcodeproj::Project.open(project_path)
if project.targets.any? { |t| t.name == "WorkoutWidget" }
  puts "Live Activity already set up"
  exit 0
end

app = project.targets.find { |t| t.name == "App" } or abort("No App target")
app_group = project.main_group.children.find { |g| g.respond_to?(:path) && g.path == "App" } or abort("No App group")

# The app's Swift files that aren't in the project yet.
%w[LiveActivityPlugin.swift MainViewController.swift].each do |name|
  next if app_group.files.any? { |f| f.path == name }
  app.add_file_references([app_group.new_reference(name)])
end

# Shared by the app and the extension.
shared = project.main_group.new_group("Shared", "Shared")
attributes = shared.new_reference("WorkoutAttributes.swift")
app.add_file_references([attributes])

# The widget extension.
deployment = "16.2"
widget = project.new_target(:app_extension, "WorkoutWidget", :ios, deployment, nil, :swift)
widget_group = project.main_group.new_group("WorkoutWidget", "WorkoutWidget")
widget.add_file_references([widget_group.new_reference("WorkoutWidgetBundle.swift"), attributes])
widget_group.new_reference("Info.plist")
# Swift links WidgetKit, SwiftUI and ActivityKit from its imports; an explicit link would point at
# one SDK version's folder and break with other Xcode versions.
widget.frameworks_build_phase.files.dup.each do |f|
  ref = f.file_ref
  f.remove_from_project
  ref&.remove_from_project
end

app_settings = app.build_configurations.first.build_settings
widget.build_configurations.each do |config|
  s = config.build_settings
  s["PRODUCT_BUNDLE_IDENTIFIER"] = "#{app_settings['PRODUCT_BUNDLE_IDENTIFIER']}.WorkoutWidget"
  s["PRODUCT_NAME"] = "$(TARGET_NAME)"
  s["INFOPLIST_FILE"] = "WorkoutWidget/Info.plist"
  s["GENERATE_INFOPLIST_FILE"] = "NO"
  s["SWIFT_VERSION"] = "5.0"
  s["IPHONEOS_DEPLOYMENT_TARGET"] = deployment
  s["TARGETED_DEVICE_FAMILY"] = "1,2"
  s["MARKETING_VERSION"] = app_settings["MARKETING_VERSION"] || "1.0"
  s["CURRENT_PROJECT_VERSION"] = app_settings["CURRENT_PROJECT_VERSION"] || "1"
  s["SKIP_INSTALL"] = "YES"
  s["LD_RUNPATH_SEARCH_PATHS"] = ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"]
  s["APPLICATION_EXTENSION_API_ONLY"] = "YES"
  s["CODE_SIGN_STYLE"] = "Automatic"
end

# Build the extension with the app and put it inside App.app/PlugIns.
app.add_dependency(widget)
embed = app.new_copy_files_build_phase("Embed Foundation Extensions")
embed.symbol_dst_subfolder_spec = :plug_ins
build_file = embed.add_file_reference(widget.product_reference, true)
build_file.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }

project.save
puts "Added the WorkoutWidget Live Activity extension"
