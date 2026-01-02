package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NetworkConnectionPermissionRepository extends JpaRepository<NetworkConnectionPermission, Long> {
    List<NetworkConnectionPermission> findByGroupIdIn(List<Long> groupIds);
    List<NetworkConnectionPermission> findByUserId(Long userId);
}

