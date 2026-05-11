package com.adrianos.launcher.ui

import android.app.*
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

class PomodoroService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var remainingSeconds = 25 * 60
    private var timerJob: Job? = null

    companion object {
        const val ACTION_START = "com.adrianos.launcher.POMODORO_START"
        const val ACTION_STOP  = "com.adrianos.launcher.POMODORO_STOP"
        const val CHANNEL_ID   = "pomodoro_channel"
        const val NOTIF_ID     = 42
        const val EXTRA_MINUTES = "minutes"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val minutes = intent.getIntExtra(EXTRA_MINUTES, 25)
                remainingSeconds = minutes * 60
                startTimer()
            }
            ACTION_STOP -> {
                timerJob?.cancel()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun startTimer() {
        createChannel()
        startForeground(NOTIF_ID, buildNotification(remainingSeconds))
        timerJob?.cancel()
        timerJob = scope.launch {
            while (remainingSeconds > 0) {
                delay(1000)
                remainingSeconds--
                updateNotification(remainingSeconds)
            }
            onTimerComplete()
        }
    }

    private fun onTimerComplete() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID + 1, NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pomodoro complete")
            .setContentText("Take a 5 minute break.")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .build()
        )
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun updateNotification(secs: Int) {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(secs))
    }

    private fun buildNotification(secs: Int): Notification {
        val mm = secs / 60
        val ss = secs % 60
        val timeStr = "%02d:%02d".format(mm, ss)
        val stopIntent = PendingIntent.getService(
            this, 0,
            Intent(this, PomodoroService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Focus — $timeStr remaining")
            .setContentText("Pomodoro timer running")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .setProgress(25 * 60, 25 * 60 - secs, false)
            .addAction(android.R.drawable.ic_delete, "Stop", stopIntent)
            .build()
    }

    private fun createChannel() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Pomodoro Timer", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
