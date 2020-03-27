
-- MySQL dump 10.13  Distrib 8.0.13, for Win64 (x86_64)
--
-- Host: localhost    Database: mobiusdb
-- ------------------------------------------------------
-- Server version	8.0.13

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 SET NAMES utf8 ;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `dasdb`;

USE `dasdb`;

--
-- Table structure for table `lookup`
--

DROP TABLE IF EXISTS `lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `lookup` (
  `url` varchar(200) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `ty` int(11) unsigned NOT NULL,
  `sri` varchar(45) NOT NULL,
  `ct` varchar(45) NOT NULL,
  `lt` varchar(45) NOT NULL,
  PRIMARY KEY (`url`),
  UNIQUE KEY `url_UNIQUE` (`url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cb`
--

DROP TABLE IF EXISTS `cb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `cb` (
  `url` varchar(200) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `rn` varchar(45) NOT NULL,
  `csi` varchar(200) NOT NULL,
  PRIMARY KEY (`url`),
  UNIQUE KEY `url_UNIQUE` (`url`),
  CONSTRAINT `cb_url` FOREIGN KEY (`url`) REFERENCES `lookup` (`url`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ae`
--

DROP TABLE IF EXISTS `ae`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `ae` (
  `url` varchar(200) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `rn` varchar(45) NOT NULL,
  `aei` varchar(45) NOT NULL,
  `class` int(11) unsigned,
  `usr` varchar(45),
  `name` varchar(45),
  `datatypes` varchar(45),
  `type` int(11) unsigned,
  `policy` longtext,
  PRIMARY KEY (`url`),
  UNIQUE KEY `url_UNIQUE` (`url`),
  CONSTRAINT `ae_url` FOREIGN KEY (`url`) REFERENCES `lookup` (`url`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cnt`
-- (2019/9/12 containerIDÇÃí«â¡Åj

DROP TABLE IF EXISTS `cnt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `cnt` (
  `url` varchar(200) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `rn` varchar(45) NOT NULL,
  `cnti` varchar(45) NOT NULL,
  `datatypes` varchar(45)  NOT NULL,
  `pae` varchar(45) NOT NULL,
  PRIMARY KEY (`url`),
  UNIQUE KEY `url_UNIQUE` (`url`),
  CONSTRAINT `cnt_url` FOREIGN KEY (`url`) REFERENCES `lookup` (`url`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `acp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `acp` (
  `trid` varchar(200) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `or` varchar(45) NOT NULL,
  `policy` longtext NOT NULL,
  `ct` varchar(45) NOT NULL,
  `lt` varchar(45) NOT NULL,
  `usr` varchar(45),
  `rlid` varchar(45),
  PRIMARY KEY (`trid`,`or`),
  UNIQUE KEY `trid_UNIQUE` (`trid`,`or`),
  CONSTRAINT `acp_trid` FOREIGN KEY (`trid`) REFERENCES `lookup` (`url`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `token` (
  `tkid` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `or` varchar(45) NOT NULL,
  `tkob` longtext NOT NULL,
  `payload` longtext NOT NULL,
  `usr` varchar(45),
  PRIMARY KEY (`tkid`,`or`),
  UNIQUE KEY `tkid_UNIQUE` (`tkid`,`or`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-12-23 18:49:36
