package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkConnectionLineRepository extends JpaRepository<NetworkConnectionLine, Long> {
}

