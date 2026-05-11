package com.adrianos.launcher.profile

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ProfileDao {
    @Query("SELECT * FROM profiles") fun observeAll(): Flow<List<Profile>>
    @Query("SELECT * FROM profiles") suspend fun getAll(): List<Profile>
    @Query("SELECT * FROM profiles WHERE isActive = 1 LIMIT 1") fun observeActive(): Flow<Profile?>
    @Query("UPDATE profiles SET isActive = 0") suspend fun deactivateAll()
    @Query("UPDATE profiles SET isActive = 1 WHERE id = :id") suspend fun setActive(id: ProfileId)
    @Query("SELECT COUNT(*) FROM profiles") suspend fun count(): Int
    @Upsert suspend fun upsert(profile: Profile)
}
