package com.adrianos.launcher.profile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class ProfileSwitchReceiver : BroadcastReceiver() {

    @Inject lateinit var profileStateMachine: ProfileStateMachine

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.net.wifi.STATE_CHANGE",
            "com.adrianos.launcher.ACTION_PROFILE_SWITCH" -> {
                profileStateMachine.evaluateAutoSwitch()
            }
        }
    }
}
