import {createElement, PanelsTopLeft, Building2, Maximize2, ArrowDown, ArrowUp, ArrowUpRight, Bold, BriefcaseBusiness, Check, ChevronDown, ChevronRight, ChevronsUpDown, Circle, CircleCheck, CircleDashed, Clapperboard, ClipboardCheck, Crosshair, ExternalLink, Eye, EyeOff, FileText, Filter, Globe, GripVertical, Highlighter, History, Image, Info, Layers, LayoutTemplate, ListOrdered, LockKeyhole, LogOut, Mail, Menu, Monitor, PanelBottom, PanelTop, Pencil, Plus, RefreshCw, RemoveFormatting, RotateCcw, Save, Search, Send, Smartphone, Sparkles, Star, Trash2, Undo2, Users, X} from 'lucide';

/** Real Lucide geometry only; labels belong to the control containing the icon. */
const icons=Object.freeze({PanelsTopLeft, Building2, Maximize2, ArrowDown, ArrowUp, ArrowUpRight, Bold, BriefcaseBusiness, Check, ChevronDown, ChevronRight, ChevronsUpDown, Circle, CircleCheck, CircleDashed, Clapperboard, ClipboardCheck, Crosshair, ExternalLink, Eye, EyeOff, FileText, Filter, Globe, GripVertical, Highlighter, History, Image, Info, Layers, LayoutTemplate, ListOrdered, LockKeyhole, LogOut, Mail, Menu, Monitor, PanelBottom, PanelTop, Pencil, Plus, RefreshCw, RemoveFormatting, RotateCcw, Save, Search, Send, Smartphone, Sparkles, Star, Trash2, Undo2, Users, X});
export function createCmsIcon(name,attributes={}){
 const icon=icons[name];if(!icon)throw new TypeError('Unknown CMS icon: '+name);
 return createElement(icon,{width:18,height:18,'stroke-width':1.75,'aria-hidden':'true',focusable:'false',...attributes,class:['cms-lucide',attributes.class].filter(Boolean).join(' '),'data-lucide':name});
}
