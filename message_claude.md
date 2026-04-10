Perfecto, estuve revisando y pensando bien todo el lado cliente de la app antes de seguir avanzando, y quiero compartirte cómo lo estoy viendo a nivel producto para que me des tu opinión.

La idea general es que la app del cliente sea simple, clara y enfocada en lo más importante: que el cliente entrene, sepa qué tiene que hacer y pueda registrar su progreso sin fricción.

Te resumo cómo estoy pensando cada parte:

Dashboard (home del cliente):
Quiero que sea una pantalla muy simple y enfocada en el día actual.

* Header con saludo + nombre + avatar del usuario
* Bloque de plan activo con:

  * nombre del plan
  * progreso
  * semana actual (ej: Semana 2 de 6)
  * botón “Ver plan” para ir a la vista completa
* Bloque principal centrado en el día de hoy:

  * mostrar fecha completa (ej: Viernes 10 de abril)
  * indicar si es día de entrenamiento o descanso
  * si es entrenamiento:

    * mostrar un pequeño contexto (ej: grupo muscular o cantidad de ejercicios)
    * botón principal “Empezar entrenamiento”
  * si es descanso:

    * mostrar un estado visual claro (icono + mensaje)
* No quiero mostrar días anteriores ni siguientes en esta pantalla, solo foco en hoy

Vista de plan:
Estoy de acuerdo con tener una pantalla donde el cliente pueda ver el plan completo.

* Navegación por semanas
* Cada semana con sus días
* Estado de cada día (completado, hoy, pendiente)
* Al entrar a un día:

  * ver ejercicios, sets y videos de cada ejercicio

Live training (la más importante):
Acá quiero una experiencia muy clara y usable en el gym.

* Un ejercicio por pantalla
* Mostrar:

  * nombre del ejercicio
  * indicador tipo “Ejercicio 2 de 5”
* Por cada serie:

  * input para peso (o tiempo si es cardio)
  * botón o check para marcar como completado
* Cuando completa todas las series:

  * permitir avanzar al siguiente ejercicio
* Navegación controlada (no scroll libre entre ejercicios)
* Al terminar todo:

  * mensaje tipo “Entrenamiento completado”
* Importante:

  * que el usuario pueda retomar si sale de la app
  * acceso fácil a ver el video del ejercicio (modal o similar, sin romper el flujo)

Historial:
No quiero historial por día, sino por semana.

* Lista de semanas completadas
* Cada semana con:

  * porcentaje de cumplimiento
  * cantidad de días completados
* Al entrar a una semana:

  * ver detalle de días y lo que hizo

Nutrición:
Por ahora la dejaría simple.

* Pantalla existente pero con estado vacío si no hay contenido
* Mensaje tipo: “Tu coach aún no cargó recomendaciones de nutrición”
* Más adelante la idea es que el coach agregue tips o comentarios

Ajustes:
Pantalla simple, sin sobrecargar.

* Foto de perfil (editable)
* Nombre visible (no editable por ahora)
* Notificaciones (toggles para recordatorios, mensajes del coach, etc.)
* Botón de cerrar sesión

Perfil:
Pantalla básica con información del cliente.

* Foto
* Nombre
* Objetivo
* Plan actual
* Opcional más adelante: datos motivacionales como racha o mejor semana

En general, lo que busco es:

* no sobrecargar las pantallas
* que todo sea rápido de entender
* que el foco esté en entrenar y registrar
* separar bien: ver → hacer → revisar

Quiero que lo mires como producto y me digas:

* si la estructura tiene sentido
* si ves algo que sobra o falta
* si mejorarías algo a nivel UX, especialmente en live training y dashboard
* si hay algo importante que no estamos considerando

Después de alinear esto, avanzamos con el plan de implementación.
