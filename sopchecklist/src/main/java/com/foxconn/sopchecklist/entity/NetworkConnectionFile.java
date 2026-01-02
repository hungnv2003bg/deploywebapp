package com.foxconn.sopchecklist.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Nationalized;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "network_connection_file")
public class NetworkConnectionFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Nationalized
    @Column(name = "file_name", columnDefinition = "NVARCHAR(400)")
    private String fileName;

    @Nationalized
    @Column(name = "file_path", columnDefinition = "NVARCHAR(1000)")
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Nationalized
    @Column(name = "file_type", columnDefinition = "NVARCHAR(50)")
    private String fileType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "network_connection_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private NetworkConnection networkConnection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "network_connection_problem_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private NetworkConnectionProblem networkConnectionProblem;
}

