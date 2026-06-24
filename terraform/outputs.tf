output "vm1_external_ip" {
  description = "IP externa de VM1 (usuario, suscripcion, catalogo)"
  value       = google_compute_instance.vm1.network_interface[0].access_config[0].nat_ip
}

output "vm1_internal_ip" {
  description = "IP interna de VM1"
  value       = google_compute_instance.vm1.network_interface[0].network_ip
}

output "vm2_external_ip" {
  description = "IP externa de VM2 (streaming, cobros, divisas, notificaciones)"
  value       = google_compute_instance.vm2.network_interface[0].access_config[0].nat_ip
}

output "vm2_internal_ip" {
  description = "IP interna de VM2"
  value       = google_compute_instance.vm2.network_interface[0].network_ip
}

output "vm3_external_ip" {
  description = "IP externa de VM3 — usar en GitHub Secret VM3_HOST (para SSH backup)"
  value       = google_compute_instance.vm3.network_interface[0].access_config[0].nat_ip
}

output "vm3_internal_ip" {
  description = "IP interna de VM3 — usar en GitHub Secret VM3_INTERNAL_IP (para conexiones BD desde GKE)"
  value       = google_compute_instance.vm3.network_interface[0].network_ip
}

output "vm4_external_ip" {
  description = "IP externa de VM4 (api-gateway, frontend) — URL pública de develop"
  value       = google_compute_instance.vm4.network_interface[0].access_config[0].nat_ip
}

output "vm4_internal_ip" {
  description = "IP interna de VM4"
  value       = google_compute_instance.vm4.network_interface[0].network_ip
}

output "gke_cluster_name" {
  description = "Nombre del clúster GKE — usar en GitHub Secret GKE_CLUSTER"
  value       = google_container_cluster.quetzaltv_cluster.name
}

output "gke_cluster_zone" {
  description = "Zona del clúster GKE — usar en GitHub Secret GKE_ZONE"
  value       = google_container_cluster.quetzaltv_cluster.location
}

output "artifact_registry_url" {
  description = "URL del repositorio Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.quetzaltv.repository_id}"
}

output "deploy_sa_email" {
  description = "Email de la SA de deploy — exportar su key para GitHub Secret GCP_SA_KEY"
  value       = google_service_account.deploy_sa.email
}

output "storage_sa_email" {
  description = "Email de la SA de storage — exportar su key para GitHub Secret GCS_SA_KEY"
  value       = google_service_account.storage_sa.email
}

output "backups_bucket_name" {
  description = "Nombre del bucket de backups — usar en GitHub Secret GCS_BACKUP_BUCKET"
  value       = google_storage_bucket.backups.name
}
