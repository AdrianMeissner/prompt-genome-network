package com.adrianos.launcher.ui

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.LauncherApps
import android.graphics.drawable.Drawable
import android.os.UserHandle
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.palette.graphics.Palette
import com.adrianos.launcher.profile.Profile
import com.adrianos.launcher.profile.ProfileId
import com.adrianos.launcher.profile.ProfileStateMachine
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar
import javax.inject.Inject

data class HomeUiState(
    val apps: List<AppInfo> = emptyList(),
    val suggestedApps: List<AppInfo> = emptyList(),
    val activeProfile: Profile? = null,
    val isFocusMode: Boolean = false,
    val searchQuery: String = "",
    val isSearchActive: Boolean = false,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    val profileStateMachine: ProfileStateMachine,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val launcherApps = context.getSystemService(Context.LAUNCHER_APPS_SERVICE) as LauncherApps
    private val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    init {
        viewModelScope.launch {
            profileStateMachine.activeProfile.collect { profile ->
                _uiState.value = _uiState.value.copy(activeProfile = profile)
                loadApps(profile)
            }
        }
    }

    private suspend fun loadApps(profile: Profile?) = withContext(Dispatchers.IO) {
        val allActivities = launcherApps.getActivityList(null, UserHandle.getUserHandleForUid(android.os.Process.myUid()))
        val pm = context.packageManager

        val filtered = allActivities.filter { activity ->
            val pkg = activity.applicationInfo.packageName
            if (profile == null) return@filter true
            val notHidden = pkg !in profile.hiddenPackages
            val allowed = profile.allowedPackages.isEmpty() || pkg in profile.allowedPackages
            notHidden && allowed
        }

        val apps = filtered.map { activity ->
            val pkg = activity.applicationInfo.packageName
            val icon: Drawable = try {
                launcherApps.getActivityIcon(activity, UserHandle.getUserHandleForUid(android.os.Process.myUid()))
                    ?: pm.getApplicationIcon(pkg)
            } catch (e: Exception) {
                pm.defaultActivityIcon
            }
            val color = extractDominantColor(icon)
            AppInfo(
                label = activity.label.toString(),
                packageName = pkg,
                icon = icon,
                dominantColor = color,
            )
        }.sortedBy { it.label }

        val suggestions = buildSuggestions(apps)

        _uiState.value = _uiState.value.copy(apps = apps, suggestedApps = suggestions)
    }

    private fun buildSuggestions(apps: List<AppInfo>): List<AppInfo> {
        val now = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, now - 7 * 86_400_000L, now
        )
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val bucket = when (hour) { in 6..11 -> 0; in 12..17 -> 1; in 18..21 -> 2; else -> 3 }

        val scored = apps.mapNotNull { app ->
            val stat = stats.find { it.packageName == app.packageName } ?: return@mapNotNull null
            val score = stat.totalTimeInForeground / 1000f
            Pair(app, score)
        }.sortedByDescending { it.second }

        return scored.take(4).map { it.first }
    }

    fun toggleFocusMode() {
        _uiState.value = _uiState.value.copy(isFocusMode = !_uiState.value.isFocusMode)
    }

    fun switchProfile(id: ProfileId) = profileStateMachine.switchTo(id)

    fun setSearchQuery(q: String) { _uiState.value = _uiState.value.copy(searchQuery = q) }
    fun setSearchActive(active: Boolean) { _uiState.value = _uiState.value.copy(isSearchActive = active) }

    fun launchApp(app: AppInfo) {
        val intent = context.packageManager.getLaunchIntentForPackage(app.packageName)
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) ?: return
        context.startActivity(intent)
    }

    private fun extractDominantColor(drawable: Drawable): Int {
        return try {
            val bitmap = drawable.toBitmap(64, 64)
            Palette.from(bitmap).generate().getDominantColor(0xFF888888.toInt())
        } catch (e: Exception) {
            0xFF888888.toInt()
        }
    }
}
