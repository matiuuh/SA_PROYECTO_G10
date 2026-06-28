# ── Service Account: operaciones de CI/CD y despliegue ───────────────────────
resource "google_service_account" "deploy_sa" {
  account_id   = "quetzaltv-deploy"
  display_name = "Quetzal TV — Deploy CI/CD"
}

# ── Service Account: firma de URLs V4 para GCS (catálogo y streaming) ─────────
resource "google_service_account" "storage_sa" {
  account_id   = "quetzal-tv-storage"
  display_name = "Quetzal TV — GCS Storage"
}

# Deploy SA: escritura en Artifact Registry
resource "google_project_iam_member" "deploy_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Deploy SA: acceso a GKE para kubectl
resource "google_project_iam_member" "deploy_gke" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Deploy SA: lectura/escritura en GCS para backups
resource "google_project_iam_member" "deploy_gcs" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Deploy SA: lectura de metadatos de Compute Engine
resource "google_project_iam_member" "deploy_compute_viewer" {
  project = var.project_id
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Storage SA: administración de objetos en GCS
resource "google_project_iam_member" "storage_sa_gcs" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.storage_sa.email}"
}

# Storage SA: creación de tokens para signed URLs V4
resource "google_project_iam_member" "storage_sa_token" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.storage_sa.email}"
}
