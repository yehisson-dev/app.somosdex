-- =============================================
-- MI SEMANA — tablas con prefijo ms_
-- =============================================

CREATE TABLE IF NOT EXISTS ms_categorias (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  color       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ms_bloques (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id      uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  dia_semana      smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
  hora_inicio     time NOT NULL,
  hora_fin        time NOT NULL,
  titulo          text NOT NULL,
  categoria_id    uuid REFERENCES ms_categorias(id) ON DELETE SET NULL,
  variante        text NOT NULL DEFAULT 'todas' CHECK (variante IN ('todas', 'A', 'B')),
  orden           smallint NOT NULL DEFAULT 0,
  google_event_id text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ms_actividades (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bloque_id   uuid REFERENCES ms_bloques(id) ON DELETE CASCADE NOT NULL,
  usuario_id  uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  titulo      text NOT NULL,
  orden       smallint NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ms_subtareas (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  actividad_id uuid REFERENCES ms_actividades(id) ON DELETE CASCADE NOT NULL,
  usuario_id   uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  titulo       text NOT NULL,
  frecuencia   text NOT NULL DEFAULT 'semanal' CHECK (frecuencia IN ('semanal', 'mensual', 'trimestral')),
  orden        smallint NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ms_subtareas_completadas (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  subtarea_id    uuid REFERENCES ms_subtareas(id) ON DELETE CASCADE NOT NULL,
  usuario_id     uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  periodo_inicio date NOT NULL,
  completada_en  timestamptz DEFAULT now(),
  UNIQUE (subtarea_id, usuario_id, periodo_inicio)
);

CREATE TABLE IF NOT EXISTS ms_pendientes (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id     uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  titulo         text NOT NULL,
  nota           text,
  categoria_id   uuid REFERENCES ms_categorias(id) ON DELETE SET NULL,
  fecha_limite   date,
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'hecho')),
  bloque_id      uuid REFERENCES ms_bloques(id) ON DELETE SET NULL,
  fecha_asignada date,
  creado_en      timestamptz DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS ms_bloques_usuario_dia ON ms_bloques (usuario_id, dia_semana);
CREATE INDEX IF NOT EXISTS ms_actividades_bloque ON ms_actividades (bloque_id);
CREATE INDEX IF NOT EXISTS ms_subtareas_actividad ON ms_subtareas (actividad_id);
CREATE INDEX IF NOT EXISTS ms_sc_subtarea_usuario ON ms_subtareas_completadas (subtarea_id, usuario_id, periodo_inicio);
CREATE INDEX IF NOT EXISTS ms_pendientes_usuario ON ms_pendientes (usuario_id, estado);

-- =============================================
-- SEED — solo para yehisson@somosdex.com
-- =============================================
DO $$
DECLARE
  v_uid        uuid;
  -- categorias
  c_ceo        uuid;
  c_dex        uuid;
  c_cubo       uuid;
  c_rhina      uuid;
  c_contenido  uuid;
  c_tech       uuid;
  -- bloques lunes
  b_lun_plan   uuid; b_lun_fin    uuid; b_lun_reu    uuid;
  b_lun_alm    uuid; b_lun_ind    uuid; b_lun_est    uuid;
  -- bloques martes
  b_mar_rev    uuid; b_mar_pro    uuid; b_mar_ven    uuid; b_mar_rhi    uuid;
  -- bloques miércoles
  b_mie_rev    uuid; b_mie_men    uuid; b_mie_ase    uuid;
  b_mie_alm    uuid; b_mie_fun    uuid; b_mie_cor    uuid;
  -- bloques jueves
  b_jue_rev    uuid; b_jue_mkt    uuid; b_jue_cam    uuid;
  b_jue_alm    uuid; b_jue_pdx    uuid; b_jue_ven    uuid;
  -- bloques viernes
  b_vie_rev    uuid; b_vie_cie    uuid; b_vie_ven    uuid;
  b_vie_alm    uuid; b_vie_tec    uuid; b_vie_rhi    uuid;
  -- bloques sábado
  b_sab_rhi    uuid; b_sab_gra    uuid;
  -- actividades
  a_id         uuid;
BEGIN
  SELECT id INTO v_uid FROM users WHERE email = 'yehisson@somosdex.com' LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Categorías
  INSERT INTO ms_categorias (usuario_id, nombre, color) VALUES (v_uid, 'CEO',       '#8E24AA') RETURNING id INTO c_ceo;
  INSERT INTO ms_categorias (usuario_id, nombre, color) VALUES (v_uid, 'Dex',       '#3F51B5') RETURNING id INTO c_dex;
  INSERT INTO ms_categorias (usuario_id, nombre, color) VALUES (v_uid, 'Cubo',      '#F4511E') RETURNING id INTO c_cubo;
  INSERT INTO ms_categorias (usuario_id, nombre, color) VALUES (v_uid, 'Rhina',     '#0B8043') RETURNING id INTO c_rhina;
  INSERT INTO ms_categorias (usuario_id, nombre, color) VALUES (v_uid, 'Contenido', '#F6BF26') RETURNING id INTO c_contenido;
  INSERT INTO ms_categorias (usuario_id, nombre, color) VALUES (v_uid, 'Tecnología','#616161') RETURNING id INTO c_tech;

  -- ── LUNES ──
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 1, '07:30', '08:30', 'Planificar la semana', c_ceo, 'todas', 1) RETURNING id INTO b_lun_plan;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 1, '08:30', '10:30', 'Finanzas de Cubo y Dex: flujo de caja, cobros, pagos', c_ceo, 'todas', 2) RETURNING id INTO b_lun_fin;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 1, '10:30', '12:30', 'Reunión equipo Cubo (tráfico incluido) y luego equipo Dex', c_ceo, 'todas', 3) RETURNING id INTO b_lun_reu;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 1, '12:30', '14:00', 'Almuerzo', c_tech, 'todas', 4) RETURNING id INTO b_lun_alm;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 1, '14:00', '16:00', 'Indicadores y revisión de ventas de ambas empresas', c_ceo, 'todas', 5) RETURNING id INTO b_lun_ind;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 1, '16:00', '18:00', 'Estrategia: plan trimestral, contrataciones, presupuestos de equipo', c_ceo, 'todas', 6) RETURNING id INTO b_lun_est;

  -- ── MARTES ──
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 2, '07:30', '08:30', 'Revisar el día', c_ceo, 'todas', 1) RETURNING id INTO b_mar_rev;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 2, '08:30', '10:30', 'Prospección Cubo: auditorías de marcas', c_cubo, 'todas', 2) RETURNING id INTO b_mar_pro;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 2, '10:30', '12:30', 'Propuestas y llamadas de venta Cubo', c_cubo, 'todas', 3) RETURNING id INTO b_mar_ven;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 2, '12:30', '18:00', 'Rhina', c_rhina, 'todas', 4) RETURNING id INTO b_mar_rhi;

  -- ── MIÉRCOLES ──
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 3, '07:30', '08:30', 'Revisar el día', c_ceo, 'todas', 1) RETURNING id INTO b_mie_rev;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 3, '08:30', '10:30', 'Planes de mentoría de clientes', c_dex, 'todas', 2) RETURNING id INTO b_mie_men;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 3, '10:30', '12:30', 'Asesoría a los mentores', c_dex, 'todas', 3) RETURNING id INTO b_mie_ase;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 3, '12:30', '14:00', 'Almuerzo', c_tech, 'todas', 4) RETURNING id INTO b_mie_alm;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 3, '14:00', '16:00', 'Funnel, CRM y automatizaciones', c_dex, 'todas', 5) RETURNING id INTO b_mie_fun;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 3, '16:00', '18:00', 'Los 2 correos de la semana y academia', c_dex, 'todas', 6) RETURNING id INTO b_mie_cor;

  -- ── JUEVES ──
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 4, '07:30', '08:30', 'Revisar el día', c_ceo, 'todas', 1) RETURNING id INTO b_jue_rev;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 4, '08:30', '10:30', 'Planes de marketing de clientes', c_cubo, 'todas', 2) RETURNING id INTO b_jue_mkt;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 4, '10:30', '12:30', 'Revisar trabajo del equipo y campañas', c_cubo, 'todas', 3) RETURNING id INTO b_jue_cam;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 4, '12:30', '14:00', 'Almuerzo', c_tech, 'todas', 4) RETURNING id INTO b_jue_alm;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 4, '14:00', '16:00', 'Prospección Dex: auditorías y propuestas', c_dex, 'todas', 5) RETURNING id INTO b_jue_pdx;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 4, '16:00', '18:00', 'Llamadas de venta Dex', c_dex, 'todas', 6) RETURNING id INTO b_jue_ven;

  -- ── VIERNES ──
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 5, '07:30', '08:30', 'Revisar el día', c_ceo, 'todas', 1) RETURNING id INTO b_vie_rev;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 5, '08:30', '10:30', 'Cierre: métricas, cobros enviados, plan del lunes', c_ceo, 'todas', 2) RETURNING id INTO b_vie_cie;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 5, '10:30', '12:30', 'Llamadas de venta Dex', c_dex, 'todas', 3) RETURNING id INTO b_vie_ven;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 5, '12:30', '14:00', 'Almuerzo', c_tech, 'todas', 4) RETURNING id INTO b_vie_alm;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 5, '14:00', '16:00', 'Tecnología y administración', c_tech, 'A', 5) RETURNING id INTO b_vie_tec;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 5, '13:00', '18:00', 'Rhina', c_rhina, 'B', 6) RETURNING id INTO b_vie_rhi;

  -- ── SÁBADO ──
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 6, '09:00', '13:00', 'Rhina', c_rhina, 'A', 1) RETURNING id INTO b_sab_rhi;
  INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (v_uid, 6, '08:30', '10:30', 'Grabar Dex, Cubo o marca personal, o academia', c_contenido, 'B', 2) RETURNING id INTO b_sab_gra;

  -- =============================================
  -- ACTIVIDADES Y SUBTAREAS
  -- =============================================

  -- Planificar la semana (lunes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_lun_plan, v_uid, 'Planificar la semana', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar el cierre del viernes anterior', 'semanal', 1),
    (a_id, v_uid, 'Elegir las 3 prioridades de la semana por empresa (Cubo, Dex, Rhina)', 'semanal', 2),
    (a_id, v_uid, 'Pasar los pendientes de tecnología al bloque del viernes', 'semanal', 3),
    (a_id, v_uid, 'Confirmar citas de venta agendadas en la semana', 'semanal', 4);

  -- Finanzas (lunes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_lun_fin, v_uid, 'Finanzas de Cubo y Dex', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar el saldo en banco de cada empresa', 'semanal', 1),
    (a_id, v_uid, 'Ver qué entró y qué salió la semana anterior', 'semanal', 2),
    (a_id, v_uid, 'Listar los cobros pendientes por cliente y su antigüedad', 'semanal', 3),
    (a_id, v_uid, 'Confirmar pagos de la semana: nómina, herramientas, suplidores', 'semanal', 4),
    (a_id, v_uid, 'Proyectar el flujo de caja de las próximas 4 semanas', 'semanal', 5),
    (a_id, v_uid, 'Comparar gastos reales contra el presupuesto del mes', 'semanal', 6),
    (a_id, v_uid, 'Enviar facturas en las fechas fijas de cobro', 'semanal', 7),
    (a_id, v_uid, 'Escribir a quien tenga más de 7 días de atraso', 'semanal', 8);

  -- Reunión de equipos (lunes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_lun_reu, v_uid, 'Reunión de equipos', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Equipo Cubo: avances por cliente, entregas de la semana, bloqueos', 'semanal', 1),
    (a_id, v_uid, 'Tráfico Cubo: inversión, resultados y cambios en campañas', 'semanal', 2),
    (a_id, v_uid, 'Equipo Dex: avance de clientes en mentoría y de los mentores', 'semanal', 3),
    (a_id, v_uid, 'Tráfico Dex: leads de la semana, costo por lead y citas generadas', 'semanal', 4),
    (a_id, v_uid, 'Dejar por escrito quién hace qué y para cuándo', 'semanal', 5);

  -- Indicadores (lunes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_lun_ind, v_uid, 'Indicadores y revisión de ventas', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Actualizar el tablero de cada empresa: prospectos, citas, cierres, clientes activos', 'semanal', 1),
    (a_id, v_uid, 'Revisar la tasa de cierre de la semana', 'semanal', 2),
    (a_id, v_uid, 'Revisar ingresos del mes contra la meta', 'semanal', 3),
    (a_id, v_uid, 'Revisar clientes en riesgo de irse', 'semanal', 4),
    (a_id, v_uid, 'Anotar 1 o 2 decisiones a partir de los números', 'semanal', 5);

  -- Estrategia (lunes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_lun_est, v_uid, 'Estrategia', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar avance del plan trimestral de Cubo y de Dex', 'semanal', 1),
    (a_id, v_uid, 'Decidir contrataciones: rol, fecha y presupuesto', 'semanal', 2),
    (a_id, v_uid, 'Revisar el presupuesto del equipo frente a los ingresos', 'semanal', 3),
    (a_id, v_uid, 'Revisar plan de marketing de Cubo y de Dex', 'semanal', 4),
    (a_id, v_uid, 'Revisar precios y paquetes de servicios', 'mensual', 5),
    (a_id, v_uid, 'Rehacer el plan con metas nuevas', 'trimestral', 6);

  -- Revisar el día (martes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mar_rev, v_uid, 'Revisar el día', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Ver la agenda del día y las citas confirmadas', 'semanal', 1),
    (a_id, v_uid, 'Elegir las 3 tareas que sí o sí se terminan hoy', 'semanal', 2),
    (a_id, v_uid, 'Responder solo lo urgente del equipo', 'semanal', 3);

  -- Prospección Cubo (martes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mar_pro, v_uid, 'Prospección Cubo', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Elegir 5 negocios a auditar en la semana', 'semanal', 1),
    (a_id, v_uid, 'Revisar redes, web, Google y anuncios activos de cada uno', 'semanal', 2),
    (a_id, v_uid, 'Anotar los 3 problemas más claros de cada marca', 'semanal', 3),
    (a_id, v_uid, 'Preparar el mensaje de contacto con un hallazgo concreto', 'semanal', 4),
    (a_id, v_uid, 'Enviar los mensajes y registrar cada prospecto en el CRM', 'semanal', 5);

  -- Propuestas y llamadas Cubo (martes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mar_ven, v_uid, 'Propuestas y llamadas de venta Cubo', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Preparar cada cita con la auditoría y el objetivo de la llamada', 'semanal', 1),
    (a_id, v_uid, 'Hacer las citas agendadas', 'semanal', 2),
    (a_id, v_uid, 'Armar la propuesta de quien mostró interés', 'semanal', 3),
    (a_id, v_uid, 'Enviar propuestas y agendar fecha de seguimiento', 'semanal', 4),
    (a_id, v_uid, 'Dar seguimiento a propuestas de la semana anterior', 'semanal', 5),
    (a_id, v_uid, 'Actualizar la etapa de cada prospecto en el CRM', 'semanal', 6);

  -- Rhina (martes) — actividades + subtareas semanales y mensuales/trimestrales
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mar_rhi, v_uid, 'Rhina', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Registrar las facturas de la semana', 'semanal', 1),
    (a_id, v_uid, 'Registrar los ingresos por día y por doctor', 'semanal', 2),
    (a_id, v_uid, 'Revisar el cuadre de caja contra lo facturado', 'semanal', 3),
    (a_id, v_uid, 'Calcular y preparar el pago a doctores', 'semanal', 4),
    (a_id, v_uid, 'Revisar y programar pagos a suplidores', 'semanal', 5),
    (a_id, v_uid, 'Revisar los indicadores de resultado del equipo', 'semanal', 6),
    (a_id, v_uid, 'Dar seguimiento a las tareas del equipo', 'semanal', 7),
    (a_id, v_uid, 'Revisar ocupación de agenda de cada doctor', 'semanal', 8),
    (a_id, v_uid, 'Revisar pacientes que no asistieron y cancelaciones', 'semanal', 9),
    (a_id, v_uid, 'Revisar presupuestos entregados y cuántos aceptaron', 'semanal', 10),
    (a_id, v_uid, 'Dar seguimiento a pacientes con tratamientos sin terminar', 'semanal', 11),
    (a_id, v_uid, 'Reunión corta con el equipo: metas y problemas', 'semanal', 12),
    (a_id, v_uid, 'Estado de resultados de la clínica', 'mensual', 13),
    (a_id, v_uid, 'Cuentas por cobrar a seguros y pacientes', 'mensual', 14),
    (a_id, v_uid, 'Ingreso por doctor y por tipo de tratamiento', 'mensual', 15),
    (a_id, v_uid, 'Pacientes nuevos y de dónde llegaron', 'mensual', 16),
    (a_id, v_uid, 'Revisión de inventario y gastos de materiales', 'mensual', 17),
    (a_id, v_uid, 'Reunión con Rhina para presentar números y decisiones', 'mensual', 18),
    (a_id, v_uid, 'Revisar avance del plan estratégico', 'trimestral', 19),
    (a_id, v_uid, 'Revisar precios de tratamientos', 'trimestral', 20),
    (a_id, v_uid, 'Evaluar al equipo y definir capacitaciones', 'trimestral', 21);

  -- Revisar el día (miércoles)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mie_rev, v_uid, 'Revisar el día', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Ver la agenda del día y las citas confirmadas', 'semanal', 1),
    (a_id, v_uid, 'Elegir las 3 tareas que sí o sí se terminan hoy', 'semanal', 2),
    (a_id, v_uid, 'Responder solo lo urgente del equipo', 'semanal', 3);

  -- Planes de mentoría (miércoles)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mie_men, v_uid, 'Planes de mentoría de clientes', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar el diagnóstico y las metas de cada clínica', 'semanal', 1),
    (a_id, v_uid, 'Revisar los números de la clínica del último mes', 'semanal', 2),
    (a_id, v_uid, 'Definir las tareas del mes para cada cliente', 'semanal', 3),
    (a_id, v_uid, 'Actualizar el plan de cada cliente y compartirlo con su mentor', 'semanal', 4);

  -- Asesoría mentores (miércoles)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mie_ase, v_uid, 'Asesoría a los mentores', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar con cada mentor el avance de sus clínicas', 'semanal', 1),
    (a_id, v_uid, 'Resolver los casos difíciles o clientes estancados', 'semanal', 2),
    (a_id, v_uid, 'Revisar que las sesiones se den en fecha', 'semanal', 3),
    (a_id, v_uid, 'Detectar qué le falta aprender a cada mentor', 'semanal', 4);

  -- Funnel CRM (miércoles)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mie_fun, v_uid, 'Funnel, CRM y automatizaciones', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar el funnel: visitas, registros, citas agendadas', 'semanal', 1),
    (a_id, v_uid, 'Revisar que los leads entren al CRM y tengan dueño', 'semanal', 2),
    (a_id, v_uid, 'Revisar que las automatizaciones de seguimiento funcionen', 'semanal', 3),
    (a_id, v_uid, 'Probar una mejora por semana', 'semanal', 4),
    (a_id, v_uid, 'Avanzar herramientas de IA para Dex', 'semanal', 5);

  -- Correos y academia (miércoles)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_mie_cor, v_uid, 'Los 2 correos de la semana y academia', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Escribir los 2 correos de la semana para la comunidad', 'semanal', 1),
    (a_id, v_uid, 'Programar los envíos y revisar resultados de los anteriores', 'semanal', 2),
    (a_id, v_uid, 'Academia: avanzar un módulo', 'semanal', 3);

  -- Revisar el día (jueves)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_jue_rev, v_uid, 'Revisar el día', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Ver la agenda del día y las citas confirmadas', 'semanal', 1),
    (a_id, v_uid, 'Elegir las 3 tareas que sí o sí se terminan hoy', 'semanal', 2),
    (a_id, v_uid, 'Responder solo lo urgente del equipo', 'semanal', 3);

  -- Planes de marketing (jueves)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_jue_mkt, v_uid, 'Planes de marketing de clientes', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar el objetivo del mes de cada cliente', 'semanal', 1),
    (a_id, v_uid, 'Definir campañas, temas de contenido y presupuesto de anuncios', 'semanal', 2),
    (a_id, v_uid, 'Pasar el plan al equipo con fechas de entrega', 'semanal', 3),
    (a_id, v_uid, 'Cliente nuevo: estudio de marca y competencia antes del plan', 'semanal', 4);

  -- Revisar trabajo equipo (jueves)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_jue_cam, v_uid, 'Revisar trabajo del equipo y campañas', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Revisar una muestra de piezas de cada cliente antes de publicar', 'semanal', 1),
    (a_id, v_uid, 'Revisar resultados de anuncios por cliente', 'semanal', 2),
    (a_id, v_uid, 'Instrucciones al equipo de tráfico: qué subir, pausar o probar', 'semanal', 3),
    (a_id, v_uid, 'Anotar fallas que se repiten para corregir el proceso', 'semanal', 4);

  -- Prospección Dex (jueves)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_jue_pdx, v_uid, 'Prospección Dex', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Elegir las clínicas a auditar', 'semanal', 1),
    (a_id, v_uid, 'Revisar su presencia digital, reseñas y señales de gestión', 'semanal', 2),
    (a_id, v_uid, 'Preparar la auditoría y el mensaje de contacto', 'semanal', 3),
    (a_id, v_uid, 'Diseñar las propuestas de quienes ya tuvieron cita', 'semanal', 4);

  -- Llamadas de venta Dex (jueves)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_jue_ven, v_uid, 'Llamadas de venta Dex', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Preparar cada llamada con la auditoría de la clínica', 'semanal', 1),
    (a_id, v_uid, 'Hacer las llamadas agendadas', 'semanal', 2),
    (a_id, v_uid, 'Enviar propuesta y fecha de seguimiento a los interesados', 'semanal', 3),
    (a_id, v_uid, 'Dar seguimiento a propuestas abiertas', 'semanal', 4),
    (a_id, v_uid, 'Actualizar el CRM', 'semanal', 5);

  -- Revisar el día (viernes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_vie_rev, v_uid, 'Revisar el día', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Ver la agenda del día y las citas confirmadas', 'semanal', 1),
    (a_id, v_uid, 'Elegir las 3 tareas que sí o sí se terminan hoy', 'semanal', 2),
    (a_id, v_uid, 'Responder solo lo urgente del equipo', 'semanal', 3);

  -- Cierre (viernes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_vie_cie, v_uid, 'Cierre', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Pasar las métricas de la semana al tablero', 'semanal', 1),
    (a_id, v_uid, 'Confirmar que se enviaron todos los cobros pendientes', 'semanal', 2),
    (a_id, v_uid, 'Revisar qué prioridades se cumplieron y cuáles no', 'semanal', 3),
    (a_id, v_uid, 'Dejar armado el plan del lunes', 'semanal', 4);

  -- Llamadas venta Dex (viernes)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_vie_ven, v_uid, 'Llamadas de venta Dex', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Preparar cada llamada con la auditoría de la clínica', 'semanal', 1),
    (a_id, v_uid, 'Hacer las llamadas agendadas', 'semanal', 2),
    (a_id, v_uid, 'Enviar propuesta y fecha de seguimiento a los interesados', 'semanal', 3),
    (a_id, v_uid, 'Dar seguimiento a propuestas abiertas', 'semanal', 4),
    (a_id, v_uid, 'Actualizar el CRM', 'semanal', 5);

  -- Tecnología y administración (viernes semana A)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_vie_tec, v_uid, 'Tecnología y administración', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Crear y configurar agentes de IA y automatizaciones', 'semanal', 1),
    (a_id, v_uid, 'Crear correos corporativos y accesos para personas nuevas', 'semanal', 2),
    (a_id, v_uid, 'Quitar accesos a quien salió del equipo', 'semanal', 3),
    (a_id, v_uid, 'Comprar o renovar dominios, hosting y espacios', 'semanal', 4),
    (a_id, v_uid, 'Revisar suscripciones y cancelar las que no se usan', 'semanal', 5),
    (a_id, v_uid, 'Pagar facturas de herramientas y servicios', 'semanal', 6),
    (a_id, v_uid, 'Registrar los gastos de la semana con su soporte', 'semanal', 7),
    (a_id, v_uid, 'Guardar facturas y comprobantes por mes', 'semanal', 8);

  -- Grabar (sábado semana B)
  INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden) VALUES (b_sab_gra, v_uid, 'Grabar', 1) RETURNING id INTO a_id;
  INSERT INTO ms_subtareas (actividad_id, usuario_id, titulo, frecuencia, orden) VALUES
    (a_id, v_uid, 'Elegir temas y guiones de Dex, Cubo y marca personal', 'semanal', 1),
    (a_id, v_uid, 'Grabar videos de Dex', 'semanal', 2),
    (a_id, v_uid, 'Grabar videos de Cubo', 'semanal', 3),
    (a_id, v_uid, 'Grabar videos de marca personal', 'semanal', 4),
    (a_id, v_uid, 'Pasar el material al editor con instrucciones', 'semanal', 5);

END $$;
