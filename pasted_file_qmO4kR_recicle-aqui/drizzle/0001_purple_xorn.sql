CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`pointId` int,
	`type` enum('user_registered','profile_updated','point_created','point_approved','point_rejected','point_updated','point_deleted','message_sent') NOT NULL,
	`description` varchar(300) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`neighborhood` varchar(120) NOT NULL,
	`address` varchar(255) NOT NULL,
	`openingHours` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`estimatedVolume` varchar(80) NOT NULL DEFAULT 'Não informado',
	`photoUrl` varchar(1024),
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`capacityStatus` enum('ativo','proximo','lotado') NOT NULL DEFAULT 'ativo',
	`approvalStatus` enum('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
	`approvedById` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collection_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pointId` int NOT NULL,
	`material` enum('Papel','Plástico','Vidro','Metal','Eletrônicos') NOT NULL,
	CONSTRAINT `point_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pointId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `point_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `communityRole` enum('Doador','Catador') DEFAULT 'Doador' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_pointId_collection_points_id_fk` FOREIGN KEY (`pointId`) REFERENCES `collection_points`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collection_points` ADD CONSTRAINT `collection_points_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collection_points` ADD CONSTRAINT `collection_points_approvedById_users_id_fk` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `point_materials` ADD CONSTRAINT `point_materials_pointId_collection_points_id_fk` FOREIGN KEY (`pointId`) REFERENCES `collection_points`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `point_messages` ADD CONSTRAINT `point_messages_pointId_collection_points_id_fk` FOREIGN KEY (`pointId`) REFERENCES `collection_points`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `point_messages` ADD CONSTRAINT `point_messages_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_logs_created_idx` ON `activity_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_logs_point_idx` ON `activity_logs` (`pointId`);--> statement-breakpoint
CREATE INDEX `collection_points_approval_idx` ON `collection_points` (`approvalStatus`);--> statement-breakpoint
CREATE INDEX `collection_points_owner_idx` ON `collection_points` (`ownerId`);--> statement-breakpoint
CREATE INDEX `collection_points_location_idx` ON `collection_points` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `point_materials_point_idx` ON `point_materials` (`pointId`);--> statement-breakpoint
CREATE INDEX `point_materials_material_idx` ON `point_materials` (`material`);--> statement-breakpoint
CREATE INDEX `point_messages_point_created_idx` ON `point_messages` (`pointId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `point_messages_author_idx` ON `point_messages` (`authorId`);