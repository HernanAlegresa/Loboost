Bien Claude, ya completaste la Fase 1 del roadmap post-testing.

Ahora estuve probando la app desde el celular (uso real) y quiero darte feedback concreto sobre lo que vi: qué funciona bien, qué mejorar y algunos puntos de UX/lógica.

---

## 1. Dashboard cliente — vista semanal

Primero, propuesta general:

Quiero que la sección “Esta semana” del cliente sea más clara y consistente con el dashboard del coach.

👉 Propuesta:

* Mostrar la semana con el mismo mapa de calor que usamos en el coach
* Agregar también el panel de información al lado (como en coach)

Esto es mucho más claro que el diseño actual.

---

## 2. Dashboard cliente — sección “Hoy”

Caso actual:

* Hoy es miércoles
* No tengo entrenamiento

### Lo que funciona bien:

* Detecta correctamente que hoy no entreno
* No permite iniciar live training (correcto)

### Mejora UX:

Quiero ajustar el header:

* Mantener el título “Hoy”
* A la derecha del título, mostrar la fecha actual (ej: “Mié 22 Abr”)
* En color lima

---

## 3. Días pasados y visualización de estado

### Problema actual:

En el dashboard y en la pantalla de plan:

* No es claro distinguir:

  * días pasados
  * día actual
  * días futuros
  * días pendientes

---

### Propuesta:

👉 Usar la misma lógica visual del mapa de calor:

* Colores o etiquetas para:

  * completado
  * pendiente
  * futuro
  * descanso

Esto debería aplicarse en:

1. Dashboard cliente (vista semanal)
2. Pantalla de plan (tarjetas por día)

---

## 4. Pantalla de plan — tarjetas de días

Problema:

* Las tarjetas de días no reflejan el estado real
* No se distingue si:

  * es pasado
  * es hoy
  * es futuro

---

### Propuesta:

Cada tarjeta debería mostrar claramente su estado:

* pendiente (día pasado no registrado)
* completado
* hoy
* futuro
* descanso

Siguiendo la misma lógica del mapa de calor

---

## 5. Registro de días pasados (problema importante)

Flujo actual:

* Desde plan, entro a un día pasado
* Veo botón “Registrar entrenamiento” ✔️
* Pero al hacer click → abre live training ❌

---

### Problema:

El registro de días pasados NO debería usar live training

👉 Diferencia clara:

* Live training → solo para hoy
* Registro manual → para días pasados

---

### Propuesta:

Para días pasados:

* Abrir flujo de registro manual
* No usar live training

---

## 6. Días futuros

* No permite registrar ✔️
* No permite iniciar entrenamiento ✔️

👉 Esto está correcto

---

## 7. Edición de plan desde el coach (gap detectado)

Actualmente:

* Solo se puede editar plan desde biblioteca
* No desde el perfil de un cliente

---

### Propuesta:

Permitir:

* editar el plan directamente desde el perfil del cliente

Esto es clave para el flujo real del coach

---

## Conclusión

La Fase 1 quedó bien a nivel lógica y datos.

Ahora los puntos a trabajar están más en:

* claridad visual
* consistencia entre pantallas
* separación correcta de flujos (live vs manual)
* mejorar experiencia del cliente
