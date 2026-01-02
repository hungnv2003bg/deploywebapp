package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;

@Entity
@Table(name = "syslog_user")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SysLogUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "FactoryID")
    private Integer factoryId;

    @Column(name = "FactoryName", columnDefinition = "NVARCHAR(50)")
    private String factoryName;

    @Column(name = "UserID", nullable = false)
    private Integer userId;
}

