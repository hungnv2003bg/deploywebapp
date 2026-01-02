package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkConnectionTypeRepository extends JpaRepository<NetworkConnectionType, Long> {
}

