package fx
{
   import bobby.§ null§;
   import bobby.§_-0v§;
   import bobby.§_-3e§;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol242")]
   public class ParticleSmog extends § null§
   {
      
      public var dx:Number = 0;
      
      public var dy:Number = 0;
      
      public var speed:Number = 0;
      
      public var dir:Number = 0;
      
      private var spinSpeed:Number = 0;
      
      private var scaleVar:Number = 1;
      
      public function ParticleSmog()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         this.dir = §_-3e§.§ else§(145,215);
         this.speed = §_-3e§.§ else§(2,4);
         this.spinSpeed = §_-3e§.§ else§(20,40);
         this.scaleVar = §_-3e§.§ else§(0.85,0.95);
         rotation = §_-3e§.§ else§(0,360);
         §_-3e§.§_-12§(this);
         §_-0v§.§_-6-§(this.handleEnterFrame);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         x += this.dx * 30 * param1;
         y += this.dy * 30 * param1;
         rotation += this.spinSpeed * 30 * param1;
         scaleX *= Math.pow(this.scaleVar,30 * param1);
         scaleY *= Math.pow(this.scaleVar,30 * param1);
         if(scaleX <= 0.1)
         {
            remove();
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         §_-0v§.§ do§(this.handleEnterFrame);
      }
   }
}

