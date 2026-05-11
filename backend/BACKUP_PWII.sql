CREATE DATABASE  IF NOT EXISTS `pwii` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `pwii`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: pwii
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `inscripciones`
--

DROP TABLE IF EXISTS `inscripciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscripciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `torneo_id` int(11) DEFAULT NULL,
  `fecha_inscripcion` timestamp NOT NULL DEFAULT current_timestamp(),
  `estatus_aprobacion` enum('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  PRIMARY KEY (`id`),
  KEY `fk_inscripcion_usuario` (`usuario_id`),
  KEY `fk_inscripcion_torneo` (`torneo_id`),
  CONSTRAINT `fk_inscripcion_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inscripcion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscripciones`
--

LOCK TABLES `inscripciones` WRITE;
/*!40000 ALTER TABLE `inscripciones` DISABLE KEYS */;
INSERT INTO `inscripciones` VALUES (1,2,2,'2026-04-22 17:28:42','aprobado'),(2,3,4,'2026-04-23 02:13:08','aprobado');
/*!40000 ALTER TABLE `inscripciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidas`
--

DROP TABLE IF EXISTS `partidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `torneo_id` int(11) DEFAULT NULL,
  `jugador1_id` int(11) DEFAULT NULL,
  `jugador2_id` int(11) DEFAULT NULL,
  `resultado` varchar(20) DEFAULT NULL,
  `ganador_id` int(11) DEFAULT NULL,
  `fecha_partida` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_partida_torneo` (`torneo_id`),
  KEY `fk_partida_j1` (`jugador1_id`),
  KEY `fk_partida_j2` (`jugador2_id`),
  KEY `fk_partida_ganador` (`ganador_id`),
  CONSTRAINT `fk_partida_ganador` FOREIGN KEY (`ganador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_partida_j1` FOREIGN KEY (`jugador1_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partida_j2` FOREIGN KEY (`jugador2_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partida_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidas`
--

LOCK TABLES `partidas` WRITE;
/*!40000 ALTER TABLE `partidas` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `premios`
--

DROP TABLE IF EXISTS `premios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `premios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `torneo_id` int(11) DEFAULT NULL,
  `posicion` int(11) NOT NULL,
  `descripcion_premio` varchar(255) NOT NULL,
  `valor_estimado` decimal(10,2) DEFAULT NULL,
  `entregado` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_premio_torneo` (`torneo_id`),
  CONSTRAINT `fk_premio_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `premios`
--

LOCK TABLES `premios` WRITE;
/*!40000 ALTER TABLE `premios` DISABLE KEYS */;
/*!40000 ALTER TABLE `premios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `torneos`
--

DROP TABLE IF EXISTS `torneos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `torneos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `juego_id` int(11) DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `estado` enum('abierto','en curso','finalizado') DEFAULT 'abierto',
  `formato` varchar(50) DEFAULT NULL,
  `premio` varchar(255) DEFAULT NULL,
  `max_participantes` int(11) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `reglas` text DEFAULT NULL,
  `creado_por` int(11) DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_torneo_juego` (`juego_id`),
  KEY `fk_torneo_creador` (`creado_por`),
  CONSTRAINT `fk_torneo_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_torneo_juego` FOREIGN KEY (`juego_id`) REFERENCES `videojuegos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `torneos`
--

LOCK TABLES `torneos` WRITE;
/*!40000 ALTER TABLE `torneos` DISABLE KEYS */;
INSERT INTO `torneos` VALUES (1,'League of Legends Championship',1,'2026-04-15 00:00:00','2026-04-20 00:00:00','abierto','Eliminación Simple','$500 USD',32,'Torneo oficial de League of Legends','Reglas estándar de competición',1,NULL),(2,'Valorant Masters',2,'2026-04-20 00:00:00','2026-04-25 00:00:00','abierto','Doble Eliminación','$300 USD',16,'Torneo de Valorant para la comunidad','Formato competitivo oficial',1,NULL),(3,'CS2 Global Cup',3,'2026-04-10 00:00:00','2026-04-18 00:00:00','abierto','Eliminación Simple','$1000 USD',64,'Copa mundial de Counter-Strike 2','Reglas estándar',1,NULL),(4,'Pokemon Champions SERIES',16,'2026-04-30 00:00:00','2026-05-07 00:00:00','abierto','Eliminación Simple','$ 200 USD',32,'Primer torneo del juego de Pokemon Champions ','Sin legendarios\nUso de objetos limitados\n1 megaevolucion\nTeracristalizacion permitida\nCero tolerancia a comportamiento antideportivo',2,NULL),(5,'Valorant SERIES 3',2,'2026-04-30 00:00:00','2026-05-09 00:00:00','en curso','Eliminación Simple','$ 150 MX',16,'Listo','Solo a pistola',2,NULL);
/*!40000 ALTER TABLE `torneos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('admin','organizador','jugador') DEFAULT 'jugador',
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  `avatar_url` varchar(500) DEFAULT NULL,
  `oauth_provider` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Ruly','ruly@gmail.com','$2b$10$JzbUB69xHQLTVKYa7ElXNuwotU7gW9ZA71wMuk038wYFsv4Yyz2G2','jugador','2026-03-11 01:49:38',NULL,NULL),(2,'Axololty','raul@gmail.com','$2b$10$IRTMMe3b7o8EqnkUsGyrM.Di3dhKFUJ5lny9SgutfpQWBbojmWmOy','jugador','2026-03-26 00:44:49',NULL,NULL),(3,'Juan','juan@gmail.com','$2b$10$ZjjRi5NvX/YOcihe1FMi9usuHitdCd80Rc6utQST2gUcopRY/vgju','jugador','2026-04-22 16:51:15',NULL,NULL),(4,'Ruly_Cortez','rulygamers02@gmail.com',NULL,'jugador','2026-05-06 02:50:20','https://lh3.googleusercontent.com/a/ACg8ocJkbmPuPaqVsd8w5b8hKLqHtXSxRnq6vtJuYzXfVWTZ9IvSIoM=s96-c','google');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `videojuegos`
--

DROP TABLE IF EXISTS `videojuegos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `videojuegos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_juego` varchar(100) NOT NULL,
  `genero` varchar(50) DEFAULT NULL,
  `plataforma` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `videojuegos`
--

LOCK TABLES `videojuegos` WRITE;
/*!40000 ALTER TABLE `videojuegos` DISABLE KEYS */;
INSERT INTO `videojuegos` VALUES (1,'League of Legends','MOBA','PC'),(2,'Valorant','FPS','PC'),(3,'Counter-Strike 2','FPS','PC'),(4,'Dota 2','MOBA','PC'),(5,'Fortnite','Battle Royale','Multiplataforma'),(6,'Rocket League','Deportes','Multiplataforma'),(7,'EA FC 25','Deportes','Multiplataforma'),(8,'Call of Duty','FPS','Multiplataforma'),(9,'Overwatch 2','FPS','PC/Consola'),(10,'Apex Legends','Battle Royale','Multiplataforma'),(11,'Super Smash Bros','Lucha','Nintendo'),(12,'Street Fighter 6','Lucha','Multiplataforma'),(13,'Rainbow Six Siege','FPS','PC/Consola'),(14,'Minecraft','Sandbox','Multiplataforma'),(15,'Clash Royale','Estrategia','Móvil'),(16,'Pokemon Champions','Combate por Turnos','Nintendo Switch');
/*!40000 ALTER TABLE `videojuegos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-10 20:17:18
