package com.foxconn.sopchecklist.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
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
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "network_connection")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class NetworkConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Nationalized
    @Column(name = "detail_address", columnDefinition = "NVARCHAR(500)")
    private String detailAddress;

    @Nationalized
    @Column(name = "responsible_department", length = 200)
    private String responsibleDepartment;

    @Column(name = "cost_code", length = 100)
    private String costCode;

    @Column(name = "bandwidth", length = 100)
    private String bandwidth;

    @Column(name = "channel_code", length = 150)
    private String channelCode;

    @Column(name = "ip_wan", length = 50)
    private String ipWan;

    @Column(name = "ip_lan", length = 50)
    private String ipLan;

    @Column(name = "price", precision = 19, scale = 2)
    private BigDecimal price;

    @Nationalized
    @Column(name = "purpose", columnDefinition = "NVARCHAR(500)")
    private String purpose;

    @Nationalized
    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @Nationalized
    @Column(name = "status", length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private NetworkConnectionArea area;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "line_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private NetworkConnectionLine line;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connection_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private NetworkConnectionType connectionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private NetworkConnectionProvider provider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private NetworkConnectionContract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private NetworkConnectionSupport support;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Nationalized
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Nationalized
    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
