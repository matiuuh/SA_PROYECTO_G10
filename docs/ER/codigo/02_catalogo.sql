CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tipo_contenido AS ENUM ('pelicula', 'serie');
CREATE TYPE tipo_reaccion AS ENUM ('like', 'dislike');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE SCHEMA IF NOT EXISTS catalogo;

CREATE TABLE catalogo.generos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE catalogo.reparto (
    id BIGSERIAL PRIMARY KEY,
    nombre_artistico VARCHAR(150) NOT NULL,
    nombre_real VARCHAR(150),
    nacionalidad VARCHAR(80)
);

CREATE TABLE catalogo.contenidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(200) NOT NULL,
    tipo tipo_contenido NOT NULL,
    sinopsis TEXT NOT NULL,
    ficha_tecnica TEXT,
    fecha_lanzamiento DATE,
    duracion_minutos INTEGER,
    idioma VARCHAR(50),
    url_portada TEXT,
    url_video TEXT,
    creado_por_cuenta_id UUID,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ,
    CONSTRAINT ck_contenido_video_pelicula CHECK (
        (tipo = 'pelicula' AND duracion_minutos IS NOT NULL)
        OR (tipo = 'serie')
    )
);

CREATE TABLE catalogo.temporadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id UUID NOT NULL REFERENCES catalogo.contenidos(id) ON DELETE CASCADE,
    numero_temporada SMALLINT NOT NULL,
    titulo VARCHAR(150),
    descripcion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_temporada_por_serie UNIQUE (contenido_id, numero_temporada)
);

CREATE TABLE catalogo.episodios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada_id UUID NOT NULL REFERENCES catalogo.temporadas(id) ON DELETE CASCADE,
    numero_episodio SMALLINT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    sinopsis TEXT,
    duracion_minutos INTEGER NOT NULL,
    url_video TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_episodio_por_temporada UNIQUE (temporada_id, numero_episodio)
);

CREATE TABLE catalogo.contenido_generos (
    contenido_id UUID NOT NULL REFERENCES catalogo.contenidos(id) ON DELETE CASCADE,
    genero_id BIGINT NOT NULL REFERENCES catalogo.generos(id) ON DELETE RESTRICT,
    PRIMARY KEY (contenido_id, genero_id)
);

CREATE TABLE catalogo.contenido_reparto (
    contenido_id UUID NOT NULL REFERENCES catalogo.contenidos(id) ON DELETE CASCADE,
    reparto_id BIGINT NOT NULL REFERENCES catalogo.reparto(id) ON DELETE RESTRICT,
    personaje VARCHAR(120),
    PRIMARY KEY (contenido_id, reparto_id)
);

CREATE TABLE catalogo.calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id UUID NOT NULL REFERENCES catalogo.contenidos(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL,
    reaccion tipo_reaccion NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calificacion_por_perfil UNIQUE (contenido_id, perfil_id)
);

CREATE TABLE catalogo.instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contenidos_titulo ON catalogo.contenidos(titulo);
CREATE INDEX idx_contenidos_tipo_estado ON catalogo.contenidos(tipo, estado);
CREATE INDEX idx_temporadas_contenido ON catalogo.temporadas(contenido_id);
CREATE INDEX idx_episodios_temporada ON catalogo.episodios(temporada_id);
CREATE INDEX idx_calificaciones_contenido ON catalogo.calificaciones(contenido_id);
CREATE INDEX idx_calificaciones_perfil ON catalogo.calificaciones(perfil_id);
CREATE INDEX idx_catalogo_instantaneas_tabla ON catalogo.instantaneas(tabla_origen, entidad_id);
