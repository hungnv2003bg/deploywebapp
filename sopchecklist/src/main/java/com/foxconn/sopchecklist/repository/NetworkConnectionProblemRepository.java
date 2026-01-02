package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.NetworkConnection;
import com.foxconn.sopchecklist.entity.NetworkConnectionProblem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NetworkConnectionProblemRepository extends JpaRepository<NetworkConnectionProblem, Long> {

    List<NetworkConnectionProblem> findByNetworkConnectionOrderByCreatedAtDesc(NetworkConnection networkConnection);
}

