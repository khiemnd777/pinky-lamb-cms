import {expect} from '@playwright/test';

/** Interact with the real combobox/listbox; never mutate application values. */
export async function choosePinkySelect(page,trigger,value){
 await revealCmsControl(page,trigger);await expect(trigger).toHaveAttribute('role','combobox');await expect(trigger).toBeEnabled();
 await trigger.press('Enter');const id=await trigger.getAttribute('aria-controls');
 const popup=page.locator(`[id=${JSON.stringify(id)}]`);await expect(popup).toBeVisible();
 const option=popup.locator(`[role="option"][data-option-value=${JSON.stringify(String(value))}]`);
 await expect(option).toHaveCount(1);await expect(option).not.toHaveAttribute('aria-disabled','true');await option.click();
 await expect(trigger).toHaveAttribute('data-value',String(value));await expect(trigger).toHaveAttribute('aria-expanded','false');
}
export async function expectPinkyValue(trigger,value){await expect(trigger).toHaveAttribute('role','combobox');await expect(trigger).toHaveAttribute('data-value',String(value));}
export async function clickCmsResource(page,value){
 const item=page.locator(`[data-cms-resource=${JSON.stringify(value)}]`);
 if(!await item.isVisible())await page.locator('#cms-menu-open').click();
 await expect(item).toBeEnabled();await item.click();
}
export async function showCmsView(page,value){const toggle=page.locator('#cms-view-toggle');if(await toggle.isVisible())await toggle.locator(`[data-cms-view=${JSON.stringify(value)}]`).click();}
export async function expectPreviewViewport(page,width,height){
 const iframe=page.locator('#preview');await expect(iframe).toBeVisible();
 const intrinsic=await iframe.evaluate(element=>({width:element.offsetWidth,height:element.offsetHeight}));expect(intrinsic).toEqual({width,height});
 const child=await page.frameLocator('#preview').locator('html').evaluate(element=>({width:element.ownerDocument.defaultView.innerWidth,height:element.ownerDocument.defaultView.innerHeight}));expect(child).toEqual({width,height});
 const bounds=await iframe.boundingBox(),host=await page.locator('.preview-viewport').boundingBox();
 expect(bounds.width).toBeGreaterThan(0);expect(bounds.width).toBeLessThanOrEqual(width);expect(bounds.right??bounds.x+bounds.width).toBeLessThanOrEqual(host.x+host.width+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}

/** Work tabs are user controls; visibility changes must not remount the editor. */
export async function showCmsWork(page,pane){
 if(!['edit','review'].includes(pane))throw new Error('Unknown CMS work pane');
 const tab=page.locator(pane==='edit'?'#cms-edit-tab':'#cms-review-tab');
 await expect(tab).toBeVisible();
 if(await tab.getAttribute('aria-selected')!=='true')await tab.click();
 await expect(tab).toHaveAttribute('aria-selected','true');
}

/** Read placement only; reveal by the same tabs and summaries a user clicks. */
export async function revealCmsControl(page,control){
 await expect(control).toHaveCount(1);
 const placement=await control.evaluate(element=>{
  function selector(node){
   if(node.id)return `[id=${JSON.stringify(node.id)}]`;
   if(!node.parentElement)return node.tagName.toLowerCase();
   return `${selector(node.parentElement)} > ${node.tagName.toLowerCase()}:nth-child(${[...node.parentElement.children].indexOf(node)+1})`;
  }
  const details=[];
  for(let parent=element.parentElement;parent;parent=parent.parentElement){
   if(parent.tagName==='DETAILS'&&parent.querySelector(':scope > summary')!==element)details.unshift(selector(parent));
  }
  return {pane:element.closest('[data-cms-pane]')?.dataset.cmsPane,preview:Boolean(element.closest('#cms-preview-host')),group:element.closest('[data-hero-section], [data-site-group]')?.id,details};
 });
 if(placement.pane){await showCmsWork(page,placement.pane);await showCmsView(page,'edit');}
 if(placement.preview)await showCmsView(page,'preview');
 if(placement.group){
  const tab=page.locator(`.cms-section-nav button[aria-controls=${JSON.stringify(placement.group)}]`);
  await expect(tab).toHaveCount(1);
  if(await tab.getAttribute('aria-pressed')!=='true')await tab.click();
  await expect(page.locator(`[id=${JSON.stringify(placement.group)}]`)).toBeVisible();
 }
 for(const selector of placement.details){
  const details=page.locator(selector);await expect(details).toHaveCount(1);
  if(!await details.evaluate(element=>element.open))await details.locator(':scope > summary').click();
 }
}
