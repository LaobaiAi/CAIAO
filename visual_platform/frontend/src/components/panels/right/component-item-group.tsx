import ComponentItem from '@/components/panels/right/component-item';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useFlowContext } from '@/contexts/flow-context';
import { ComponentGroup } from '@/data/sidebar-components';

interface ComponentItemGroupProps {
  group: ComponentGroup;
  activeItem: string | null;
  allCategories?: string[];
  onChangeCategory?: (serverName: string, categoryName: string) => void;
}

export function ComponentItemGroup({ 
  group, 
  activeItem,
  allCategories = [],
  onChangeCategory,
}: ComponentItemGroupProps) {
  const { name, icon: Icon, iconColor, items } = group;
  const { addComponentToFlow } = useFlowContext();

  const handleItemClick = async (componentName: string) => {
    try {
      await addComponentToFlow(componentName);
    } catch (error) {
      console.error('Failed to add component to flow:', error);
    }
  };

  const handleChangeCategory = (itemName: string, categoryName: string) => {
    if (onChangeCategory) {
      // Use the serverName if available, otherwise use the display name
      const item = items.find(i => i.name === itemName);
      const serverKey = item?.serverName || itemName;
      onChangeCategory(serverKey, categoryName);
    }
  };
  
  return (
    <AccordionItem key={name} value={name} className="border-none">
      <AccordionTrigger className="px-4 py-2 text-sm hover-bg hover:no-underline">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <span className="capitalize">{name}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="space-y-1">
          {items.map((item) => (
            <ComponentItem 
              key={item.name}
              icon={item.icon} 
              label={item.name} 
              isActive={activeItem === item.name}
              onClick={() => handleItemClick(item.name)}
              categories={allCategories}
              currentCategory={name}
              onChangeCategory={(cat) => handleChangeCategory(item.name, cat)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
} 