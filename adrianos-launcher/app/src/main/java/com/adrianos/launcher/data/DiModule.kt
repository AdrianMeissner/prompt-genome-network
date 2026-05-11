package com.adrianos.launcher.data

import android.content.Context
import com.adrianos.launcher.profile.ProfileDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DiModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): AppDatabase = AppDatabase.create(ctx)

    @Provides
    fun provideProfileDao(db: AppDatabase): ProfileDao = db.profileDao()
}
