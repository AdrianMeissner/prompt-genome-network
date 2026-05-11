package com.adrianos.launcher.profile

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class ProfileEvalWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val profileStateMachine: ProfileStateMachine,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        profileStateMachine.evaluateAutoSwitch()
        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<ProfileEvalWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().build())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "profile_eval",
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}
