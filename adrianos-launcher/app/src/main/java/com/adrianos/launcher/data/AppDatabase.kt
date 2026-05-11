package com.adrianos.launcher.data

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import android.content.Context
import com.adrianos.launcher.profile.Profile
import com.adrianos.launcher.profile.ProfileConverters
import com.adrianos.launcher.profile.ProfileDao

@Database(entities = [Profile::class], version = 1, exportSchema = false)
@TypeConverters(ProfileConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun profileDao(): ProfileDao

    companion object {
        fun create(context: Context): AppDatabase =
            Room.databaseBuilder(context, AppDatabase::class.java, "adrianos.db")
                .fallbackToDestructiveMigration()
                .build()
    }
}
