import React, { useState } from "react";
import { Users, Target, Zap, MessageSquare, HelpCircle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SectionTitle, Field } from "./FormHelpers";

const Step5Audience = () => {
  const [testimonials, setTestimonials] = useState([{ name: "", text: "" }]);
  const [faqs, setFaqs] = useState([{ question: "", answer: "" }]);

  const addTestimonial = () => testimonials.length < 3 && setTestimonials([...testimonials, { name: "", text: "" }]);
  const removeTestimonial = (index: number) => testimonials.length > 1 && setTestimonials(testimonials.filter((_, i) => i !== index));

  const addFaq = () => faqs.length < 5 && setFaqs([...faqs, { question: "", answer: "" }]);
  const removeFaq = (index: number) => faqs.length > 1 && setFaqs(faqs.filter((_, i) => i !== index));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="Tu público y propuesta de valor" 
        subtitle="Entender a quién le sirves y qué te hace diferente es clave para el éxito de tu web." 
      />
      
      <div className="grid gap-6">
        <Field label="¿Quién es tu cliente ideal?" required>
          <div className="relative">
            <Users className="absolute left-3 top-4 w-4 h-4 text-muted-foreground/60" />
            <Textarea 
              placeholder="Ej: Madres latinas trabajadoras en el área de Miami que buscan servicios rápidos y de confianza..." 
              className="min-h-[100px] pl-10 bg-background/50 border-muted-foreground/10 focus:bg-background transition-colors resize-none"
            />
          </div>
        </Field>

        <Field label="¿Qué problema resuelves?" required>
          <div className="relative">
            <Target className="absolute left-3 top-4 w-4 h-4 text-muted-foreground/60" />
            <Textarea 
              placeholder="Ej: Ayudamos a que las familias dejen de preocuparse por la limpieza de su hogar para que disfruten su tiempo libre..." 
              className="min-h-[100px] pl-10 bg-background/50 border-muted-foreground/10 focus:bg-background transition-colors resize-none"
            />
          </div>
        </Field>

        <Field label="¿Qué te hace diferente de la competencia?" required>
          <div className="relative">
            <Zap className="absolute left-3 top-4 w-4 h-4 text-muted-foreground/60" />
            <Textarea 
              placeholder="Ej: Ofrecemos garantía de satisfacción, somos bilingües y usamos productos orgánicos certificados..." 
              className="min-h-[100px] pl-10 bg-background/50 border-muted-foreground/10 focus:bg-background transition-colors resize-none"
            />
          </div>
        </Field>
      </div>

      <div className="pt-8 border-t border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" /> Testimonios de clientes
            </h3>
            <p className="text-xs text-muted-foreground">La prueba social genera confianza inmediata.</p>
          </div>
          {testimonials.length < 3 && (
            <Button variant="ghost" size="sm" onClick={addTestimonial} className="text-primary hover:text-primary hover:bg-primary/10">
              <Plus size={16} className="mr-1" /> Agregar
            </Button>
          )}
        </div>
        
        <div className="grid gap-4">
          {testimonials.map((t, index) => (
            <div key={index} className="bg-secondary/30 rounded-2xl p-5 relative group border border-transparent hover:border-primary/20 transition-all">
              {testimonials.length > 1 && (
                <button onClick={() => removeTestimonial(index)} className="absolute top-4 right-4 text-destructive/50 hover:text-destructive group-hover:scale-110 transition-all">
                  <Trash2 size={16} />
                </button>
              )}
              <div className="grid gap-4">
                <Input placeholder="Nombre del cliente" className="h-10 bg-background border-muted-foreground/10" />
                <Textarea placeholder="Escribe lo que el cliente dijo sobre tu excelente trabajo..." className="min-h-[80px] bg-background border-muted-foreground/10 resize-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle size={18} className="text-primary" /> Preguntas frecuentes (FAQ)
            </h3>
            <p className="text-xs text-muted-foreground">Ahorra tiempo respondiendo preguntas comunes.</p>
          </div>
          {faqs.length < 5 && (
            <Button variant="ghost" size="sm" onClick={addFaq} className="text-primary hover:text-primary hover:bg-primary/10">
              <Plus size={16} className="mr-1" /> Agregar
            </Button>
          )}
        </div>
        
        <div className="grid gap-4">
          {faqs.map((f, index) => (
            <div key={index} className="bg-secondary/30 rounded-2xl p-5 relative group border border-transparent hover:border-primary/20 transition-all">
              {faqs.length > 1 && (
                <button onClick={() => removeFaq(index)} className="absolute top-4 right-4 text-destructive/50 hover:text-destructive group-hover:scale-110 transition-all">
                  <Trash2 size={16} />
                </button>
              )}
              <div className="grid gap-4">
                <Input placeholder="Pregunta (Ej: ¿Aceptan tarjetas de crédito?)" className="h-10 bg-background border-muted-foreground/10" />
                <Textarea placeholder="Respuesta breve y clara..." className="min-h-[80px] bg-background border-muted-foreground/10 resize-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step5Audience;
