# Override freerasp 8.0.0's invalid consumerProguardFile rule.
# The plugin specifies -flattenpackagehierarchy without a package,
# which Gradle rejects. This file must be processed by the build.
-dontwarn com.talsec.**
-keep class com.talsec.** { *; }
-flattenpackagehierarchy com.talsec
