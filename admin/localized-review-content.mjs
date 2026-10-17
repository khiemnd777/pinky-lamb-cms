const labels={
 title:'Tiêu đề',eyebrow:'Nhãn đầu mục',subtitle:'Tiêu đề phụ',summary:'Mô tả tóm tắt',scope:'Phạm vi công việc',
 heading:'Tiêu đề chính',intro:'Giới thiệu',loadMoreLabel:'Nhãn nút xem thêm',description:'Mô tả',
 primaryAction:'Nút chính',secondaryAction:'Nút phụ',label:'Nhãn nút',footnote:'Chú thích',note:'Ghi chú',image:'Ảnh',alt:'Mô tả ảnh',
 descriptor:'Mô tả đầu mục',tagline:'Thông điệp thương hiệu',ctaLabel:'Nhãn nút',credentialLabel:'Nhãn hồ sơ năng lực',logoAlt:'Mô tả logo',
 lead:'Đoạn mở đầu',paragraphs:'Các đoạn nội dung',experienceLabel:'Nhãn kinh nghiệm',experienceCopy:'Mô tả kinh nghiệm',experienceLocationLabel:'Nhãn địa điểm',
 signatureCopy:'Thông điệp chữ ký',signatureAlt:'Mô tả ảnh chữ ký',reelHeading:'Tiêu đề showreel',reelCaption:'Chú thích showreel',reelTitle:'Tên showreel',reelPosterAlt:'Mô tả ảnh bìa showreel',
 disciplines:'Lĩnh vực',imageAlt:'Mô tả ảnh',personPhoneLabel:'Nhãn điện thoại cá nhân',officePhoneLabel:'Nhãn điện thoại văn phòng',addressLines:'Địa chỉ',illustrationAlt:'Mô tả ảnh minh họa',
 backToTopLabel:'Nhãn về đầu trang',copyrightLabel:'Dòng bản quyền',ogTitle:'Tiêu đề chia sẻ',ogDescription:'Mô tả chia sẻ',shareAlt:'Mô tả ảnh chia sẻ'
};
const sections={clients:'Khách hàng',work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio',contact:'Liên hệ'};

/** Render editorial copy with reader-facing captions; technical identity stays in source details. */
export function appendLocalizedReviewContent(target,content,{project}={}){
 const doc=target.ownerDocument,node=(tag,text)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 function runs(parent,value){for(const run of value){const el=node(run.emphasis==='STRONG'?'strong':'span',run.text);if(run.emphasis==='ACCENT')el.className='rich-accent';parent.append(el);}}
 function value(parent,copy){
  if(typeof copy==='string'||typeof copy==='number'){parent.append(node('p',String(copy)));return;}
  if(copy?.lines){const heading=node('h3');copy.lines.forEach((line,index)=>{if(index)heading.append(node('br'));runs(heading,line);});parent.append(heading);return;}
  if(Array.isArray(copy)){if(copy.length&&copy.every(run=>run&&typeof run.text==='string')){const paragraph=node('p');runs(paragraph,copy);parent.append(paragraph);}else if(copy.length){const list=node('ol');for(const item of copy){const row=node('li');value(row,item);list.append(row);}parent.append(list);}else parent.append(node('p','Chưa có nội dung.'));return;}
  if(copy&&typeof copy==='object')for(const [key,item]of Object.entries(copy))field(parent,key,item);
 }
 function field(parent,key,copy){
  if(copy===undefined||copy===null)return;
  if(key==='imageAlts'){
   parent.append(node('small','Mô tả ảnh'));
   let galleryNumber=0;
   for(const [slot,alt]of Object.entries(copy)){
    const index=project?.gallery.findIndex(image=>slot===`gallery:${image.assetId}`);
    const caption=slot==='cover'?'Ảnh bìa':`Ảnh thư viện ${index>=0?index+1:++galleryNumber}`;
    parent.append(node('small',caption));value(parent,alt);
   }
   return;
  }
  if(key==='navLabels'||key==='logoAlts'){
   parent.append(node('small',key==='navLabels'?'Nhãn menu':'Mô tả logo khách hàng'));
   copy.forEach((item,index)=>{parent.append(node('small',key==='navLabels'?`Menu · ${sections[item.sectionId]??'Mục '+(index+1)}`:`Logo ${index+1}`));value(parent,key==='navLabels'?item.label:item.alt);});return;
  }
  parent.append(node('small',labels[key]??'Nội dung bổ sung'));value(parent,copy);
 }
 if(content)for(const [key,copy]of Object.entries(content))field(target,key,copy);
}
