package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionProvider;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkConnectionProviderRepository extends JpaRepository<NetworkConnectionProvider, Long> {
}

