Estoy comenzando un nuevo proyecto desde cero y quiero que me ayudes a analizarlo, planificarlo y recomendar la mejor forma de abordarlo utilizando todas tus capacidades (Claude Code), herramientas disponibles, plugins instalados y buenas prácticas actuales.

Primero te voy a explicar el proyecto de forma completa para que tengas todo el contexto.

## 🧠 Proyecto: LoBoost

LoBoost es una web app (mobile-first + desktop) enfocada en coaches de fitness. El objetivo es crear una plataforma donde los entrenadores puedan gestionar sus clientes, crear planes de entrenamiento y hacer seguimiento del progreso de cada cliente de forma profesional, moderna y eficiente.

---

## 🎯 Enfoque del producto

* Enfoque principal: fitness / entrenamiento
* Enfoque secundario: nutrición (simple, no compleja)

La parte de nutrición no será avanzada (sin tracking de macros ni cálculos complejos), sino más bien recomendaciones o planes simples en formato texto.

---

## 👥 Usuarios

### Coach (usuario principal)

Puede:

* Crear clientes
* Ver lista de clientes
* Acceder al dashboard individual de cada cliente
* Crear ejercicios (biblioteca propia)
* Crear planes de entrenamiento
* Crear planes de nutrición
* Editar y gestionar todo
* Asignar planes a clientes

---

### Cliente

Puede:

* Ver su dashboard personal
* Ver su plan de entrenamiento
* Ver ejercicios asignados
* Ver plan nutricional
* Registrar progreso

---

## 🏋️ Estructura de planes

Un plan tiene:

* duración en semanas (ej: 4 semanas)
* semanas fijas

Cada semana:

* contiene días (lunes a domingo)

Cada día:

* contiene ejercicios

Cada ejercicio:

* sets (definido por el coach)
* reps (definido por el coach)
* peso (lo registra el cliente)

---

## 📚 Biblioteca de ejercicios

* Cada coach tiene su propia biblioteca de ejercicios
* Puede crear ejercicios personalizados
* Puede reutilizarlos en múltiples planes
* Se permite modificar (override) un ejercicio dentro de un plan sin afectar la biblioteca

---

## 📊 Progreso del cliente

El cliente puede:

* Marcar ejercicios como completados
* Marcar días como completados
* Registrar el peso utilizado en cada ejercicio

---

## 📈 Historial

* Se guarda desde el inicio
* El cliente puede ver su progreso en el tiempo

---

## 🧠 Lógica importante

* Cuando un plan se asigna a un cliente, se crea una COPIA del plan (no referencia compartida)
* Cada cliente tiene 1 plan activo
* Se mantiene historial de planes anteriores

---

## 💬 Comunicación

* No habrá chat interno en el MVP
* La comunicación será externa (ej: WhatsApp)

---

## 🎨 Dirección de diseño

Busco una estética:

* Premium
* Deportiva
* Minimalista
* Moderna

Colores:

* Base: negros / grises oscuros
* Primario: verde / lima (fitness vibe)
* Secundarios: grises / plateados
* Acentos: blanco / detalles premium

Tipografía:

* Moderna
* Legible en mobile
* Con buena jerarquía visual

---

## 🎯 Lo que necesito de vos

Quiero que analices este proyecto como un AI engineer y como un sistema completo, no solo como código.

Necesito que me ayudes con lo siguiente:

1. Cómo me recomendás abordar este proyecto desde cero utilizando Claude Code
2. Qué arquitectura inicial recomendarías (estructura de proyecto, carpetas, etc.)
3. Cómo organizarías el flujo de trabajo conmigo (cómo interactuar, cómo dividir tareas, etc.)
4. Qué herramientas de las que ya tengo disponibles en mi entorno podrían potenciar este proyecto
5. Si tiene sentido utilizar herramientas externas como Stitch para el diseño del frontend y cómo integrarlo correctamente con el desarrollo
6. Si recomendarías usar skills, cuáles y cómo estructurarlas
7. Si recomendarías usar multi-agents o subagents, en qué momento y para qué casos
8. Buenas prácticas para optimizar el uso de contexto, tokens y rendimiento
9. Riesgos o errores comunes que debería evitar en este tipo de proyecto
10. Cualquier mejora o recomendación que consideres importante para llevar este proyecto a un nivel profesional

---

## ⚠️ Importante

No quiero que empieces a escribir código todavía.

Quiero que primero:

* analices
* propongas
* estructures
* y me des una guía clara y profesional

Luego, en base a eso, vamos a avanzar paso a paso.

---

Quiero que respondas con un enfoque estructurado, claro y orientado a construir un sistema sólido desde el inicio.
