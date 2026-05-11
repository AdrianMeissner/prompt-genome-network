package com.adrianos.launcher.profile

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import androidx.room.TypeConverters

enum class ProfileId { SCHOOL, SPORT, SLEEP, DEEP_WORK, PERSONAL }

data class TimeRange(val startHour: Int, val startMin: Int, val endHour: Int, val endMin: Int) {
    fun contains(hour: Int, min: Int): Boolean {
        val now = hour * 60 + min
        val start = startHour * 60 + startMin
        val end = endHour * 60 + endMin
        return if (start <= end) now in start..end else now >= start || now <= end
    }
}

@Entity(tableName = "profiles")
@TypeConverters(ProfileConverters::class)
data class Profile(
    @PrimaryKey val id: ProfileId,
    val displayName: String,
    val accentColor: Long,           // ARGB packed long
    val wallpaperVariant: String,    // dawn | day | dusk | night | custom
    val iconPackUri: String?,
    val allowedPackages: List<String>,  // empty = all allowed
    val hiddenPackages: List<String>,
    val dndMode: Int,                // NotificationManager.INTERRUPTION_FILTER_*
    val timeRange: TimeRange?,
    val wifiSsid: String?,
    val geofenceLatLng: Pair<Double, Double>?,
    val geofenceRadiusMeters: Float,
    val calendarKeyword: String?,
    val isActive: Boolean = false,
)

class ProfileConverters {
    @TypeConverter fun fromPackageList(v: List<String>): String = v.joinToString("|")
    @TypeConverter fun toPackageList(v: String): List<String> = if (v.isEmpty()) emptyList() else v.split("|")

    @TypeConverter fun fromTimeRange(v: TimeRange?): String? =
        v?.let { "${it.startHour}:${it.startMin}-${it.endHour}:${it.endMin}" }
    @TypeConverter fun toTimeRange(v: String?): TimeRange? = v?.let {
        val parts = it.split("-")
        val s = parts[0].split(":"); val e = parts[1].split(":")
        TimeRange(s[0].toInt(), s[1].toInt(), e[0].toInt(), e[1].toInt())
    }

    @TypeConverter fun fromLatLng(v: Pair<Double, Double>?): String? = v?.let { "${it.first},${it.second}" }
    @TypeConverter fun toLatLng(v: String?): Pair<Double, Double>? = v?.let {
        val p = it.split(","); Pair(p[0].toDouble(), p[1].toDouble())
    }
}

fun defaultProfiles(): List<Profile> = listOf(
    Profile(
        id = ProfileId.SCHOOL,
        displayName = "School",
        accentColor = 0xFF2979FF,
        wallpaperVariant = "day",
        iconPackUri = null,
        allowedPackages = listOf("com.google.android.apps.docs", "com.duolingo", "org.wikipedia"),
        hiddenPackages = listOf("com.instagram.android", "com.zhiliaoapp.musically"),
        dndMode = 2, // INTERRUPTION_FILTER_PRIORITY
        timeRange = TimeRange(8, 0, 15, 30),
        wifiSsid = null,
        geofenceLatLng = null,
        geofenceRadiusMeters = 200f,
        calendarKeyword = "school",
    ),
    Profile(
        id = ProfileId.SPORT,
        displayName = "Sport",
        accentColor = 0xFFFF6D00,
        wallpaperVariant = "dawn",
        iconPackUri = null,
        allowedPackages = listOf("com.strava", "com.spotify.music", "com.google.android.apps.maps"),
        hiddenPackages = emptyList(),
        dndMode = 3, // INTERRUPTION_FILTER_ALARMS
        timeRange = null,
        wifiSsid = null,
        geofenceLatLng = null,
        geofenceRadiusMeters = 300f,
        calendarKeyword = "workout",
    ),
    Profile(
        id = ProfileId.SLEEP,
        displayName = "Sleep",
        accentColor = 0xFF1A1A2E,
        wallpaperVariant = "night",
        iconPackUri = null,
        allowedPackages = listOf("com.android.deskclock"),
        hiddenPackages = emptyList(),
        dndMode = 1, // INTERRUPTION_FILTER_NONE
        timeRange = TimeRange(22, 30, 7, 0),
        wifiSsid = null,
        geofenceLatLng = null,
        geofenceRadiusMeters = 0f,
        calendarKeyword = null,
    ),
    Profile(
        id = ProfileId.DEEP_WORK,
        displayName = "Deep Work",
        accentColor = 0xFFCF1020,
        wallpaperVariant = "dusk",
        iconPackUri = null,
        allowedPackages = listOf("com.termux", "com.github.android", "com.jetbrains.rider"),
        hiddenPackages = listOf("com.instagram.android", "com.twitter.android", "com.reddit.frontpage"),
        dndMode = 1,
        timeRange = null,
        wifiSsid = "HomeOffice-WiFi",
        geofenceLatLng = null,
        geofenceRadiusMeters = 0f,
        calendarKeyword = "deep work",
    ),
    Profile(
        id = ProfileId.PERSONAL,
        displayName = "Personal",
        accentColor = 0xFF7C4DFF,
        wallpaperVariant = "day",
        iconPackUri = null,
        allowedPackages = emptyList(),
        hiddenPackages = emptyList(),
        dndMode = 4, // INTERRUPTION_FILTER_ALL
        timeRange = null,
        wifiSsid = null,
        geofenceLatLng = null,
        geofenceRadiusMeters = 0f,
        calendarKeyword = null,
        isActive = true,
    ),
)
