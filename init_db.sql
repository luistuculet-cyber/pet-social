-- ======================================================
-- AVO (Asistencia Veterinaria Online) - Base de Datos MySQL
-- Script de Inicialización v0.3
-- ======================================================

-- 1. Tabla de Usuarios (Tutores, Veterinarios, Managers y Administradores)
CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `name` VARCHAR(191) NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'tutor',
  `isPremium` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `actionRadiusKm` INT NULL DEFAULT 15,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `isOnline` BOOLEAN NOT NULL DEFAULT false,
  `lastSeenAt` DATETIME(3) NULL,
  `passwordHash` VARCHAR(191) NULL,
  `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
  `phone` VARCHAR(191) NULL,
  `address` VARCHAR(191) NULL,
  `cbu` VARCHAR(191) NULL,
  `university` VARCHAR(191) NULL,
  `licenseNumber` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `User_email_key`(`email`),
  INDEX `User_lat_lng_idx`(`lat`, `lng`),
  INDEX `User_isOnline_role_idx`(`isOnline`, `role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1.1. Tabla de Documentos de Veterinarios
CREATE TABLE IF NOT EXISTS `VetDocument` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `docType` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `filePath` VARCHAR(191) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `encryptionIV` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `VetDocument_userId_idx`(`userId`),
  CONSTRAINT `VetDocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Tabla de Configuración Persistente del Sistema
CREATE TABLE IF NOT EXISTS `SystemConfig` (
  `id` VARCHAR(191) NOT NULL,
  `configKey` VARCHAR(191) NOT NULL,
  `configValue` TEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SystemConfig_key`(`configKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Tabla de Mascotas
CREATE TABLE IF NOT EXISTS `Pet` (
  `id` VARCHAR(191) NOT NULL,
  `tutorId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `species` VARCHAR(191) NOT NULL,
  `breed` VARCHAR(191) NULL,
  `age` VARCHAR(191) NULL,
  `weight` DOUBLE NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `Pet_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Tabla de Solicitudes y Despachos (Urgencias / Video Consultas)
CREATE TABLE IF NOT EXISTS `Dispatch` (
  `id` VARCHAR(191) NOT NULL,
  `tutorId` VARCHAR(191) NOT NULL,
  `vetId` VARCHAR(191) NULL,
  `offeredVetId` VARCHAR(191) NULL,
  `offerExpiresAt` DATETIME(3) NULL,
  `rejectedVetIds` TEXT NULL,
  `attemptCount` INT NOT NULL DEFAULT 0,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `price` DOUBLE NOT NULL,
  `serviceType` VARCHAR(191) NOT NULL DEFAULT 'domicilio',
  `symptoms` TEXT NULL,
  `petName` VARCHAR(191) NULL,
  `petSpecies` VARCHAR(191) NULL,
  `paymentMethod` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Dispatch_status_serviceType_idx`(`status`, `serviceType`),
  INDEX `Dispatch_lat_lng_idx`(`lat`, `lng`),
  INDEX `Dispatch_offeredVetId_idx`(`offeredVetId`),
  CONSTRAINT `Dispatch_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Dispatch_vetId_fkey` FOREIGN KEY (`vetId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Tabla de Historias Clínicas y Fichas Médicas
CREATE TABLE IF NOT EXISTS `MedicalRecord` (
  `id` VARCHAR(191) NOT NULL,
  `dispatchId` VARCHAR(191) NOT NULL,
  `petName` VARCHAR(191) NOT NULL,
  `petSpecies` VARCHAR(191) NOT NULL,
  `petBreed` VARCHAR(191) NULL,
  `petAge` VARCHAR(191) NULL,
  `petWeight` VARCHAR(191) NULL,
  `diagnosis` TEXT NOT NULL,
  `treatment` TEXT NOT NULL,
  `postCareInstructions` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `MedicalRecord_dispatchId_key`(`dispatchId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `MedicalRecord_dispatchId_fkey` FOREIGN KEY (`dispatchId`) REFERENCES `Dispatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. Insertar Usuarios Iniciales en Base de Datos
INSERT INTO `User` (`id`, `email`, `name`, `role`, `isPremium`, `status`, `lat`, `lng`, `isOnline`, `passwordHash`, `createdAt`)
VALUES 
  ('u-admin-gerente', 'gerencia@avo.com', 'G3r3nt3 (Gerencia)', 'admin', true, 'active', -34.6037, -58.3816, true, '$2b$12$C4zjvAMPKjex/qMQL14g4OqF/b7avEEff17YfbY5ZtVpumGlxpbxG', NOW()),
  ('u-2', 'dr.martinez@ejemplo.com', 'Dr. Roberto Martínez', 'vet', true, 'active', -34.5889, -58.4305, true, '$2b$12$YmrNu6o.L7lv/18Xm0xd6.jjKwTkNx78MesyChJb7lm5DITVGKmuq', NOW()),
  ('u-3', 'dra.valenzuela@ejemplo.com', 'Dra. Sofía Valenzuela', 'vet', true, 'active', -34.5711, -58.4233, true, '$2b$12$YmrNu6o.L7lv/18Xm0xd6.jjKwTkNx78MesyChJb7lm5DITVGKmuq', NOW()),
  ('u-1', 'maria.tutor@ejemplo.com', 'María Fernández', 'tutor', false, 'active', -34.6037, -58.3816, false, NULL, NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `role`=VALUES(`role`), `passwordHash`=VALUES(`passwordHash`);
