resource "google_compute_network" "quetzaltv_vpc" {
  name                    = "quetzaltv-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "quetzaltv_subnet" {
  name          = "quetzaltv-subnet"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.quetzaltv_vpc.id
  region        = var.region

  # Rangos secundarios para pods y servicios de GKE
  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = "10.2.0.0/20"
  }
}

# SSH desde cualquier origen — necesario para Ansible y CI/CD
resource "google_compute_firewall" "allow_ssh" {
  name    = "quetzaltv-allow-ssh"
  network = google_compute_network.quetzaltv_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["quetzaltv-vm"]
}

# HTTP (80) desde internet — solo VM4 (api-gateway + frontend)
resource "google_compute_firewall" "allow_http" {
  name    = "quetzaltv-allow-http"
  network = google_compute_network.quetzaltv_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["quetzaltv-public"]
}

# Tráfico interno entre VMs y pods de GKE:
#   - gRPC de microservicios   : 5001–5007
#   - HTTP de microservicios   : 8001–8007
#   - PostgreSQL por servicio  : 5433–5439
#   - Redis                    : 6379
resource "google_compute_firewall" "allow_internal" {
  name    = "quetzaltv-allow-internal"
  network = google_compute_network.quetzaltv_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["5001-5007", "8001-8007", "5433-5439", "6379"]
  }

  # Rango de la subnet de VMs + rango de pods de GKE
  source_ranges = ["10.0.0.0/24", "10.1.0.0/16"]
  target_tags   = ["quetzaltv-vm"]
}

# Grafana (3000) y Prometheus (9090) accesibles desde internet
resource "google_compute_firewall" "allow_grafana" {
  name    = "quetzaltv-allow-grafana"
  network = google_compute_network.quetzaltv_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["3000", "9090"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["quetzaltv-vm"]
}

# Scrape privado de exporters desde la VPC interna y los pods de GKE.
resource "google_compute_firewall" "allow_monitoring_exporters" {
  name    = "quetzaltv-allow-monitoring-exporters"
  network = google_compute_network.quetzaltv_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["9100"]
  }

  source_ranges = ["10.0.0.0/24", "10.1.0.0/16"]
  target_tags   = ["quetzaltv-monitoring-target"]
}

# Health checks de GCP para el balanceador de carga de GKE Ingress
resource "google_compute_firewall" "allow_health_checks" {
  name    = "quetzaltv-allow-health-checks"
  network = google_compute_network.quetzaltv_vpc.name

  allow {
    protocol = "tcp"
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["quetzaltv-gke"]
}
