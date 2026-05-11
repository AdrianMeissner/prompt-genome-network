package com.adrianos.launcher.profile

import android.app.NotificationManager
import android.content.Context
import android.net.wifi.WifiManager
import android.os.VibrationEffect
import android.os.Vibrator
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileStateMachine @Inject constructor(
    @ApplicationContext private val context: Context,
    private val profileRepository: ProfileRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _activeProfile = MutableStateFlow<Profile?>(null)
    val activeProfile: StateFlow<Profile?> = _activeProfile.asStateFlow()

    init {
        scope.launch {
            profileRepository.getActiveProfile().collect { profile ->
                if (profile != null && profile.id != _activeProfile.value?.id) {
                    applyProfile(profile)
                }
            }
        }
    }

    fun switchTo(profileId: ProfileId) {
        scope.launch {
            profileRepository.setActiveProfile(profileId)
        }
    }

    /** Called by WorkManager every 15 minutes and on WiFi/boot events. */
    fun evaluateAutoSwitch() {
        scope.launch {
            val profiles = profileRepository.getAllProfiles()
            val cal = Calendar.getInstance()
            val hour = cal.get(Calendar.HOUR_OF_DAY)
            val min = cal.get(Calendar.MINUTE)
            val ssid = currentWifiSsid()

            val triggered = profiles.firstOrNull { profile ->
                val timeMatch = profile.timeRange?.contains(hour, min) == true
                val wifiMatch = profile.wifiSsid != null && profile.wifiSsid == ssid
                timeMatch || wifiMatch
            }

            if (triggered != null && triggered.id != _activeProfile.value?.id) {
                profileRepository.setActiveProfile(triggered.id)
            }
        }
    }

    private fun applyProfile(profile: Profile) {
        _activeProfile.value = profile
        applyDndPolicy(profile.dndMode)
        playProfileHaptic(profile.id)
    }

    private fun applyDndPolicy(filter: Int) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.isNotificationPolicyAccessGranted) {
            nm.setInterruptionFilter(filter)
        }
    }

    private fun playProfileHaptic(id: ProfileId) {
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        val pattern = when (id) {
            ProfileId.SLEEP     -> longArrayOf(0, 30, 80, 20)
            ProfileId.SPORT     -> longArrayOf(0, 20, 40, 60, 40, 20)
            ProfileId.SCHOOL    -> longArrayOf(0, 40, 60, 40)
            ProfileId.DEEP_WORK -> longArrayOf(0, 80)
            ProfileId.PERSONAL  -> longArrayOf(0, 25, 25, 25)
        }
        val amps = IntArray(pattern.size) { if (it % 2 == 0) 0 else 180 }
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, amps, -1))
    }

    private fun currentWifiSsid(): String? {
        val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wm.connectionInfo?.ssid?.removeSurrounding("\"")
    }
}
