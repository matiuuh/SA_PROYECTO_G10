resource "google_container_cluster" "quetzaltv_cluster" {
  name     = "quetzaltv-cluster"
  location = var.zone

  network    = google_compute_network.quetzaltv_vpc.name
  subnetwork = google_compute_subnetwork.quetzaltv_subnet.name

  # Se elimina el node pool por defecto para usar uno personalizado
  remove_default_node_pool = true
  initial_node_count       = 1

  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # Permite destroy sin protección (útil para proyectos académicos)
  deletion_protection = false
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "quetzaltv-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.quetzaltv_cluster.name
  node_count = var.gke_node_count

  node_config {
    machine_type = var.gke_machine_type
    disk_size_gb = 50
    disk_type    = "pd-standard"
    tags         = ["quetzaltv-gke"]

    service_account = google_service_account.deploy_sa.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
