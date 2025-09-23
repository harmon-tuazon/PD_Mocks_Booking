# 🚀 Product Improvements Request Template

**Project**: Mock Exam Booking System
**Date**: 09-19-2025
**Requested By**: __Harmon_______
**Priority**: [ ] Low [ ] Medium [x] High [ ] Critical

---

## 📋 **Improvement Summary**

### **Brief Description** (1-2 sentences)
I need you to change two UI components. 
- First, I need you to change the snack bar that notifies whether the user has enough tokens or not. Instead of showing the sum of available tokens, the user must see the amount of tokens per token type. Never show the aggregate.
- Second, create a card that will show the amount per token. This card component must be present throughout all the following routes:
1. /book/exam-types
2. /book/exams
3. /book/:mockExamId
4. /booking/confirmation/:bookingId



### **Category** (Check one)
- [ ] 🐛 **Bug Fix** - Something isn't working as expected
- [ ] ✨ **New Feature** - Add new functionality
- [ ] 🔧 **Enhancement** - Improve existing functionality
- [X] 🎨 **UI/UX** - Frontend design or user experience changes
- [ ] ⚡ **Performance** - Speed or efficiency improvements
- [ ] 🔒 **Security** - Security-related changes
- [ ] 📚 **Documentation** - Update docs or help content
- [ ] 🏗️ **Infrastructure** - Backend, deployment, or architecture changes

---

## 🎯 **Current State vs Desired State**

### **What's happening now?**
```
As of the moment, there are no indicators of how many tokens/credits doctors have until the snack bar shows up after token validation. 

```

### **What should happen instead?**
```
There should be a UI component explicitly showing how many tokens/credits doctors have so that they are clear how many tokens they have.

```

### **Why is this change needed?**
```
This will allow doctors to see how many tokens they have even before attempting to book.

```

---

## 📍 **Technical Details**

### **Affected Components** (Check all that apply)
- [ ] 🔙 **Backend API** (`/api/`)
- [X] 🖥️ **Frontend React App** (`/frontend/`)
- [ ] 🏢 **HubSpot Integration** (CRM objects, properties, associations)
- [ ] ☁️ **Vercel Deployment** (functions, domains, environment)
- [ ] 🧪 **Tests** (unit, integration, e2e)
- [ ] 📖 **Documentation** (README, API docs, comments)
- [ ] Other: ___________

### **Specific Files/Endpoints** (if known)
- frontend\src\components\BookingConfirmation.jsx
- frontend\src\components\BookingForm.jsx
- frontend\src\components\ExamSessionsList.jsx
- frontend\src\components\ExamTypeSelector.jsx

### **Data Requirements**
- [ ] No data changes needed
- [ ] Update existing HubSpot properties
- [ ] Create new HubSpot properties
- [ ] Modify HubSpot object associations
- [ ] Change API request/response format
- [ ] Other: ___________

---

## 👥 **User Impact**

### **Who will this affect?**
- [X] Students booking exams
- [ ] PrepDoctors admin staff
- [ ] System administrators
- [ ] All users
- [ ] Other: ___________

### **User Story** (optional)
```
As an End User booking an exam slit, I want to see be able to see my tokens/credits consistently so that I am aware of how many tokens I have at any given time.

```

---

## 🧪 **Testing Requirements**

### **How should this be tested?**
- [X] Manual testing is sufficient
- [ ] Unit tests needed
- [ ] Integration tests needed
- [ ] Test with real HubSpot data
- [ ] Load testing required
- [ ] Other: ___________

### **Test Scenarios**
```
[Describe specific scenarios to test]
```

---

## ⚠️ **Risk Assessment**

### **Potential Risks** (Check all that apply)
- [ ] Could break existing bookings
- [ ] Might affect HubSpot data integrity
- [ ] Could impact system performance
- [ ] May require downtime
- [ ] Risk of data loss
- [X] No significant risks identified
- [ ] Other: ___________

### **Backwards Compatibility**
- [ ] Fully backwards compatible
- [ ] Requires migration of existing data
- [ ] Breaking change - users need to be notified
- [X] Not applicable

---

## 📅 **Timeline & Dependencies**

### **Urgency Level**
- [X] **Immediate** - System is broken, fix ASAP
- [ ] **This Week** - Important for operations
- [ ] **Next Sprint** - Would improve user experience
- [ ] **Future Release** - Nice to have improvement

### **Dependencies** (Check if any apply)
- [ ] Requires HubSpot configuration changes
- [ ] Needs environment variable updates
- [ ] Depends on external API changes
- [ ] Requires coordination with other systems
- [X] None identified

### **Estimated Effort**
- [X] **Small** (< 2 hours) - Simple config or minor fix
- [ ] **Medium** (2-8 hours) - New endpoint or component
- [ ] **Large** (1-3 days) - Major feature addition
- [ ] **Unknown** - Need investigation first

---

## 🎨 **Visual/Design Requirements**

### **Mockups or Examples** (if applicable)
```
[Attach screenshots, mockups, or describe visual changes needed]
```
-screenshots\Sample Card-Table Component.png

### **Design Specifications**
```
[Colors, fonts, layout requirements, responsive behavior, etc.]
```

---

## 📊 **Success Criteria**

### **How will we know this is complete?**
```
Users can successfully see how many tokens they have while logged in.

Example:
- Users can successfully book exams without errors
- Association appears correctly in HubSpot
- Page loads in under 2 seconds
```

### **Metrics to Track** (if applicable)
- [ ] Booking success rate
- [ ] Page load time
- [ ] Error rate reduction
- [X] User satisfaction
- [ ] Other: ___________

---

## 📝 **Additional Context**

### **Technical Notes**
```
[Any technical constraints, API limitations, or implementation notes]
```
**Sample Table from Shadcn**
```javascript
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableCaption>A list of your recent invoices.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Method</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>Credit Card</TableCell>
      <TableCell className="text-right">$250.00</TableCell>
    </TableRow>
  </TableBody>
</Table>

```


---

## 🔄 **Implementation Approach** (Optional - for complex requests)

### **Suggested Solution**
```
[If you have ideas on how this should be implemented]
```

### **Alternative Approaches**
```
[Any alternative ways to solve this problem]
```

---

## ✅ **Implementation Checklist** (Once executed finish this checklist)

- [ ] Requirements analysis completed
- [ ] PRD generated (if needed) - Not needed for this simple fix
- [ ] Implementation completed
- [ ] Tests written and passing - Test script created: `test-fixed-associations.js`
- [ ] Code deployed to staging - N/A (direct to production)
- [ ] Stakeholder review completed - Pending user testing
- [ ] Deployed to production - Deployed to: https://mocksbooking-cnnxg9d2l-farismarei-7539s-projects.vercel.app
- [ ] Documentation updated - Added detailed logging for debugging
- [ ] Success criteria verified - Pending user verification

---

## 📞 **Contact Information**

**Requester**: ___Harmon Tuazon___
**Email**: ___htuazon@prepdoctors.com___
**Best time to discuss**: ___________

---

**🎯 Ready to Submit?**
Save this file as `improvements/YYYY-MM-DD-[improvement-name].md` and let me know it's ready for implementation!

---

*Template Version: 1.0 | Framework: PrepDoctors HubSpot Automation | Updated: 2025-01-18*