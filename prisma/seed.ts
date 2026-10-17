import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding OpsFlow database...");

  // Clean existing data
  await prisma.activityLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.idempotencyRecord.deleteMany({});
  await prisma.workItem.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});

  // 1. Create Teams
  const paymentsTeam = await prisma.team.create({
    data: {
      key: "PAYMENTS",
      name: "Payments & Settlement",
      description: "Payment gateways, ledger reconciliation, chargebacks, and checkout engineering.",
    },
  });

  const infraTeam = await prisma.team.create({
    data: {
      key: "INFRA",
      name: "Core Infrastructure",
      description: "Cloud computing, Kubernetes clusters, database reliability, and observability.",
    },
  });

  const securityTeam = await prisma.team.create({
    data: {
      key: "SECURITY",
      name: "InfoSec & Compliance",
      description: "PCI-DSS, SOC2 compliance, vulnerability mitigation, and access governance.",
    },
  });

  const supportTeam = await prisma.team.create({
    data: {
      key: "SUPPORT",
      name: "Customer Operations",
      description: "VIP escalated issues, account investigations, and tier-3 customer resolution.",
    },
  });

  console.log("✓ Teams created");

  // 2. Create Users
  const sarahAdmin = await prisma.user.create({
    data: {
      id: "usr_sarah_admin",
      name: "Sarah Chen",
      email: "sarah.chen@opsflow.internal",
      role: "ADMIN",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      teamId: infraTeam.id,
    },
  });

  const alexLead = await prisma.user.create({
    data: {
      id: "usr_alex_lead",
      name: "Alex Rivera",
      email: "alex.rivera@opsflow.internal",
      role: "TEAM_LEAD",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      teamId: paymentsTeam.id,
    },
  });

  const mayaMember = await prisma.user.create({
    data: {
      id: "usr_maya_member",
      name: "Maya Lin",
      email: "maya.lin@opsflow.internal",
      role: "MEMBER",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      teamId: paymentsTeam.id,
    },
  });

  const marcusLead = await prisma.user.create({
    data: {
      id: "usr_marcus_lead",
      name: "Marcus Vance",
      email: "marcus.vance@opsflow.internal",
      role: "TEAM_LEAD",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      teamId: infraTeam.id,
    },
  });

  const jamesMember = await prisma.user.create({
    data: {
      id: "usr_james_member",
      name: "James Wilson",
      email: "james.wilson@opsflow.internal",
      role: "MEMBER",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      teamId: supportTeam.id,
    },
  });

  const elenaLead = await prisma.user.create({
    data: {
      id: "usr_elena_lead",
      name: "Elena Rostova",
      email: "elena.rostova@opsflow.internal",
      role: "TEAM_LEAD",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
      teamId: securityTeam.id,
    },
  });

  console.log("✓ Personas and Users created");

  // 3. Seed Realistic Operational Work Items

  // Item 1: Stripe Webhook Gateway Timeout
  const item1 = await prisma.workItem.create({
    data: {
      key: "OPS-1001",
      title: "Stripe Webhook Gateway Timeout Spike [504 Outage]",
      description: "Sudden latency surge in webhook delivery pipeline causing dropped invoice.paid events for EU tier customers. Needs immediate triage and redis queue scaling.",
      type: "INCIDENT",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      teamId: paymentsTeam.id,
      creatorId: alexLead.id,
      assigneeId: mayaMember.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours from now
      version: 3,
      requiresApproval: false,
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        workItemId: item1.id,
        actorId: alexLead.id,
        action: "CREATED",
        details: JSON.stringify({ message: "Created critical incident for webhook latency" }),
        createdAt: new Date(Date.now() - 1000 * 60 * 90),
      },
      {
        workItemId: item1.id,
        actorId: alexLead.id,
        action: "ASSIGNED",
        details: JSON.stringify({ assignedTo: mayaMember.name }),
        createdAt: new Date(Date.now() - 1000 * 60 * 75),
      },
      {
        workItemId: item1.id,
        actorId: mayaMember.id,
        action: "STATUS_CHANGED",
        details: JSON.stringify({ from: "OPEN", to: "IN_PROGRESS" }),
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    ],
  });

  await prisma.comment.create({
    data: {
      workItemId: item1.id,
      authorId: mayaMember.id,
      content: "Investigating the webhook listener worker pool. We noticed 12 deadlocks in the PostgreSQL connection pool during the EU morning traffic surge.",
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
    },
  });

  // Item 2: PCI-DSS Compliance Request (Requires Approval!)
  const item2 = await prisma.workItem.create({
    data: {
      key: "OPS-1002",
      title: "PCI-DSS Annual Audit Evidence & Production Access Review",
      description: "Gather privileged IAM logs, firewall change histories, and KMS encryption key rotation attestations for Q4 compliance. Requires signoff before formal submission to external auditor.",
      type: "COMPLIANCE_REQUEST",
      status: "IN_REVIEW",
      priority: "HIGH",
      teamId: securityTeam.id,
      creatorId: sarahAdmin.id,
      assigneeId: elenaLead.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48), // 2 days
      version: 2,
      requiresApproval: true,
      approvalStatus: "PENDING",
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        workItemId: item2.id,
        actorId: sarahAdmin.id,
        action: "CREATED",
        details: JSON.stringify({ message: "Initiated annual PCI-DSS review work item" }),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        workItemId: item2.id,
        actorId: elenaLead.id,
        action: "APPROVAL_REQUESTED",
        details: JSON.stringify({ message: "Requested approval from Security Lead / Admin" }),
        createdAt: new Date(Date.now() - 1000 * 60 * 120),
      },
    ],
  });

  // Item 3: Unassigned Critical Chargeback (Ready for Atomic Claim Demo!)
  const item3 = await prisma.workItem.create({
    data: {
      key: "OPS-1003",
      title: "Unassigned: High-Value Chargeback Settlement Dispute ($45,200)",
      description: "Cardholder bank dispute filed on transaction txn_892149812. 12-hour statutory deadline to provide signed invoice and shipping bill of lading or funds will be debited.",
      type: "PAYMENT_INVESTIGATION",
      status: "OPEN",
      priority: "CRITICAL",
      teamId: paymentsTeam.id,
      creatorId: alexLead.id,
      assigneeId: null, // UNASSIGNED!
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 12),
      version: 1,
      requiresApproval: false,
    },
  });

  await prisma.activityLog.create({
    data: {
      workItemId: item3.id,
      actorId: alexLead.id,
      action: "CREATED",
      details: JSON.stringify({ message: "Logged urgent unassigned dispute item needing immediate claim." }),
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
  });

  // Item 4: Blocked Kubernetes Ingress Alert
  const item4 = await prisma.workItem.create({
    data: {
      key: "OPS-1004",
      title: "Kubernetes Primary Ingress Controller CPU Throttling Alert",
      description: "Ingress pods in us-east-1 experiencing CFS quota throttling during batch indexing. Blocked pending quota upgrade request with cloud finance team.",
      type: "INCIDENT",
      status: "BLOCKED",
      priority: "HIGH",
      teamId: infraTeam.id,
      creatorId: sarahAdmin.id,
      assigneeId: marcusLead.id,
      version: 2,
      requiresApproval: false,
    },
  });

  await prisma.activityLog.create({
    data: {
      workItemId: item4.id,
      actorId: marcusLead.id,
      action: "STATUS_CHANGED",
      details: JSON.stringify({ from: "IN_PROGRESS", to: "BLOCKED", reason: "Pending quota increase approval" }),
      createdAt: new Date(Date.now() - 1000 * 60 * 150),
    },
  });

  // Item 5: Emergency Wire Transfer Approval Required
  const item5 = await prisma.workItem.create({
    data: {
      key: "OPS-1005",
      title: "Emergency Settlement Wire Release > $100k (Acme Corp)",
      description: "Vendor settlement payout exceeds automatic threshold. Requires dual approval by Payments Lead or Administrator before funds release.",
      type: "GENERAL_OPERATIONS",
      status: "OPEN",
      priority: "CRITICAL",
      teamId: paymentsTeam.id,
      creatorId: mayaMember.id,
      assigneeId: alexLead.id,
      version: 1,
      requiresApproval: true,
      approvalStatus: "PENDING",
    },
  });

  await prisma.activityLog.create({
    data: {
      workItemId: item5.id,
      actorId: mayaMember.id,
      action: "APPROVAL_REQUESTED",
      details: JSON.stringify({ message: "Submitted wire request for management approval" }),
      createdAt: new Date(Date.now() - 1000 * 60 * 40),
    },
  });

  // Item 6: Customer Issue
  await prisma.workItem.create({
    data: {
      key: "OPS-1006",
      title: "Tier-1 Escalation: Bulk CSV export corrupting UTF-8 characters",
      description: "Reports from 4 enterprise customers in France and Japan that customer name diacritics appear mangled in exported CSV reports.",
      type: "CUSTOMER_ISSUE",
      status: "OPEN",
      priority: "MEDIUM",
      teamId: supportTeam.id,
      creatorId: jamesMember.id,
      assigneeId: jamesMember.id,
      version: 1,
      requiresApproval: false,
    },
  });

  // Item 7: Resolved Engineering Task
  const item7 = await prisma.workItem.create({
    data: {
      key: "OPS-1007",
      title: "Rotate expired mTLS certificates for internal billing microservices",
      description: "Internal communication certificates between billing engine and auth service rotated and verified across all production nodes.",
      type: "ENGINEERING_TASK",
      status: "RESOLVED",
      priority: "MEDIUM",
      teamId: infraTeam.id,
      creatorId: marcusLead.id,
      assigneeId: sarahAdmin.id,
      version: 4,
      requiresApproval: false,
    },
  });

  await prisma.activityLog.create({
    data: {
      workItemId: item7.id,
      actorId: sarahAdmin.id,
      action: "STATUS_CHANGED",
      details: JSON.stringify({ from: "IN_REVIEW", to: "RESOLVED" }),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  // Item 8: Closed Compliance Item
  await prisma.workItem.create({
    data: {
      key: "OPS-1008",
      title: "SOC2 Access Revocation for departed contractor accounts",
      description: "All access tokens, GitHub permissions, and SSH bastion keys revoked within statutory 4-hour SLA.",
      type: "COMPLIANCE_REQUEST",
      status: "CLOSED",
      priority: "HIGH",
      teamId: securityTeam.id,
      creatorId: sarahAdmin.id,
      assigneeId: elenaLead.id,
      version: 5,
      requiresApproval: true,
      approvalStatus: "APPROVED",
      approvedById: sarahAdmin.id,
      approvedAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
    },
  });

  console.log("✓ Operational Work Items, Comments, and Activity logs seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
