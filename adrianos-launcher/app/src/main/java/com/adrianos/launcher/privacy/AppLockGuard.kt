package com.adrianos.launcher.privacy

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.adrianos.launcher.ui.AppInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class AppLockGuard @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val prefs by lazy {
        val masterKey = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "app_locks",
            masterKey,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun isLocked(app: AppInfo): Boolean = prefs.getBoolean(app.packageName, false)

    fun setLocked(packageName: String, locked: Boolean) {
        prefs.edit().putBoolean(packageName, locked).apply()
    }

    fun lockedPackages(): Set<String> = prefs.all.filter { it.value == true }.keys.toSet()

    /**
     * Returns true if the user authenticated successfully or the app isn't locked.
     * Must be called from a FragmentActivity context.
     */
    suspend fun authenticateIfNeeded(activity: FragmentActivity, app: AppInfo): Boolean {
        if (!isLocked(app)) return true

        val canAuth = BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
                BiometricManager.BIOMETRIC_SUCCESS

        if (!canAuth) return false

        return suspendCancellableCoroutine { cont ->
            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(activity, executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        if (cont.isActive) cont.resume(true)
                    }
                    override fun onAuthenticationFailed() {}
                    override fun onAuthenticationError(code: Int, msg: CharSequence) {
                        if (cont.isActive) cont.resume(false)
                    }
                }
            )
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(app.label)
                .setSubtitle("Unlock to open")
                .setNegativeButtonText("Cancel")
                .build()
            prompt.authenticate(info)
        }
    }
}
