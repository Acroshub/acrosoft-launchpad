const TerminosPoliticas = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">

      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Términos y Políticas de Privacidad</h1>
        <p className="text-sm text-muted-foreground">Última actualización: abril 2025 · Acrosoft Labs</p>
      </div>

      <Section title="1. Quiénes somos">
        <p>
          Acrosoft Labs (en adelante "Acrosoft") es una empresa de software que provee una plataforma CRM
          como servicio (SaaS) a negocios y emprendedores. Nuestra plataforma permite a los clientes
          (en adelante "el Cliente") recolectar, gestionar y contactar a sus propios contactos y prospectos.
        </p>
      </Section>

      <Section title="2. Rol de Acrosoft como procesador de datos">
        <p>
          Acrosoft actúa exclusivamente como <strong>procesador de datos</strong>. Proveemos la infraestructura
          técnica necesaria para que el Cliente opere su CRM, pero no somos los responsables del tratamiento
          de los datos personales de los usuarios finales.
        </p>
        <p>
          El Cliente es el único <strong>responsable del tratamiento</strong> de los datos que recolecta a
          través de los formularios, calendarios y herramientas de Acrosoft. El Cliente decide qué datos
          recolectar, con qué fin, y por cuánto tiempo conservarlos.
        </p>
      </Section>

      <Section title="3. Datos que se recolectan">
        <p>
          A través de los formularios y calendarios del CRM, el Cliente puede recolectar datos personales
          de los usuarios finales, incluyendo pero no limitándose a:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm pl-2">
          <li>Nombre completo</li>
          <li>Correo electrónico</li>
          <li>Número de teléfono</li>
          <li>Empresa u organización</li>
          <li>Cualquier otro dato ingresado voluntariamente en los formularios</li>
        </ul>
        <p>
          Estos datos son utilizados <strong>únicamente para fines de contacto y gestión comercial</strong> por
          parte del Cliente. Acrosoft no comercializa ni comparte estos datos con terceros.
        </p>
      </Section>

      <Section title="4. Uso de los datos">
        <p>
          Los datos recolectados a través de la plataforma de Acrosoft son utilizados exclusivamente para:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm pl-2">
          <li>Gestionar la relación comercial entre el Cliente y sus contactos</li>
          <li>Enviar comunicaciones solicitadas (recordatorios de citas, confirmaciones, etc.)</li>
          <li>Permitir al Cliente organizar y dar seguimiento a su base de contactos</li>
        </ul>
        <p>
          En ningún caso los datos serán utilizados para publicidad de terceros, venta a otras empresas
          ni perfilamiento con fines distintos a los descritos.
        </p>
      </Section>

      <Section title="5. Almacenamiento y seguridad">
        <p>
          Los datos son almacenados en servidores seguros provistos por Supabase (infraestructura en la nube
          con certificación SOC 2). Acrosoft implementa medidas técnicas y organizativas razonables para
          proteger la información contra accesos no autorizados, pérdida o destrucción.
        </p>
      </Section>

      <Section title="6. Derechos del usuario final">
        <p>
          Los usuarios finales que hayan proporcionado sus datos a través de un formulario del CRM tienen
          derecho a solicitar:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm pl-2">
          <li>Acceso a los datos almacenados sobre ellos</li>
          <li>Rectificación de datos incorrectos</li>
          <li>Eliminación de sus datos ("derecho al olvido")</li>
        </ul>
        <p>
          Estas solicitudes deben dirigirse directamente al Cliente que opera el formulario, ya que
          Acrosoft actúa como procesador y no como responsable del tratamiento.
        </p>
      </Section>

      <Section title="7. Responsabilidad del Cliente">
        <p>
          Al utilizar los servicios de Acrosoft, el Cliente acepta que es el único responsable de:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm pl-2">
          <li>Obtener el consentimiento informado de sus usuarios finales</li>
          <li>Cumplir con la legislación de protección de datos aplicable en su jurisdicción</li>
          <li>Informar a sus usuarios finales sobre el uso que hará de sus datos</li>
          <li>No utilizar la plataforma para recolectar datos de forma ilícita o sin consentimiento</li>
        </ul>
      </Section>

      <Section title="8. Contacto">
        <p>
          Si tienes preguntas sobre estas políticas, puedes contactarnos en{" "}
          <a href="mailto:hola@acrosoft.app" className="text-primary underline underline-offset-2">
            hola@acrosoft.app
          </a>
          .
        </p>
      </Section>

      <div className="pt-6 border-t border-border text-xs text-muted-foreground">
        Acrosoft Labs · Todos los derechos reservados · 2025
      </div>
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      {children}
    </div>
  </section>
);

export default TerminosPoliticas;
