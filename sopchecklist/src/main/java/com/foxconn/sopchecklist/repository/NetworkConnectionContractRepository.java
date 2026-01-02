package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnectionContract;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkConnectionContractRepository extends JpaRepository<NetworkConnectionContract, Long> {
}

