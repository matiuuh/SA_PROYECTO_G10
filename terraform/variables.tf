variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "sa-proyecto-g10-500320"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "vm_machine_type_app" {
  description = "Tipo de máquina para VMs de aplicación (VM1, VM2, VM4)"
  type        = string
  default     = "e2-medium"
}

variable "vm_machine_type_db" {
  description = "Tipo de máquina para VM de bases de datos (VM3)"
  type        = string
  default     = "e2-standard-2"
}

variable "gke_machine_type" {
  description = "Tipo de máquina para nodos del clúster GKE"
  type        = string
  default     = "e2-standard-2"
}

variable "gke_node_count" {
  description = "Número de nodos en el clúster GKE"
  type        = number
  default     = 2
}

variable "ssh_public_key" {
  description = "Clave pública SSH para acceso a las VMs (Ansible y CI/CD)"
  type        = string
}

variable "ssh_user" {
  description = "Usuario SSH para las VMs"
  type        = string
  default     = "ubuntu"
}
