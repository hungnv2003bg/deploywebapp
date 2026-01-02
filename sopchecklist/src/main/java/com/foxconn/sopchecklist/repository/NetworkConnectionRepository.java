package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkConnectionRepository extends JpaRepository<NetworkConnection, Long> {
}

