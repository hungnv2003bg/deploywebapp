package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionSupport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkConnectionSupportRepository extends JpaRepository<NetworkConnectionSupport, Long> {
}

