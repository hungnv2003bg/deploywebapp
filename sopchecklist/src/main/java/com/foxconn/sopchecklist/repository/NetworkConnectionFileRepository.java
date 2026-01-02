package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NetworkConnectionFileRepository extends JpaRepository<NetworkConnectionFile, Long> {
    List<NetworkConnectionFile> findByNetworkConnectionIdOrderByCreatedAtDesc(Long networkConnectionId);
    List<NetworkConnectionFile> findByNetworkConnectionProblemIdOrderByCreatedAtDesc(Long networkConnectionProblemId);
}

