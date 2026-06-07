---
description: Registra una decisión, bug resuelto o convención en la memoria del proyecto
---

El usuario quiere guardar algo en la memoria del proyecto (reemplaza a Engram). La memoria
es el archivo `memoria/DECISIONES.md`.

Pasos:

1. Tomá lo que el usuario quiere recordar (`$ARGUMENTS`). Si no fue claro, preguntá de qué
   tipo es: decisión técnica, bug resuelto, o convención.

2. Agregá una entrada **al final** de `memoria/DECISIONES.md` (no borres ni reescribas lo
   anterior) con este formato:

```markdown
### [AAAA-MM-DD] — [Título corto]
- **Tipo**: decisión | bug | convención
- **Qué**: [qué se decidió / qué bug se corrigió / qué convención se fijó]
- **Por qué / causa raíz**: [el motivo de la decisión, o la causa raíz del bug — no el síntoma]
- **Impacto**: [qué archivos o partes del proyecto afecta]
```

3. Usá la fecha real de hoy. Confirmá al usuario qué entrada agregaste.

Recordatorio: este mismo registro debe hacerse automáticamente durante `/planificar`,
`/implementar` y cuando se resuelve un bug, aunque el usuario no use este comando.
